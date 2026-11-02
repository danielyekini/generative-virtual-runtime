#!/usr/bin/env python3
"""Mirror repository issue state onto Project #3 fields.

Issues are the source of truth agents can always write (labels, body, claim
comments, closed state). This script derives Project fields from them so
sessions without Project API access still keep the board current. It only
writes a field when a rule produces a value; otherwise manual board values
are left alone.

Rules (first match wins for Status):
  closed as completed            -> Done
  closed otherwise               -> Deferred
  latest gvr-claim active, unexpired -> In progress
  body "Board status: <Status>"  -> that Status
  label state:ready              -> Ready
Workstream from lane:*, Kind from kind:*, Priority from priority:p*.

Modes: probe (report token capabilities, no changes), dry-run, sync.
Token: GVR_GITHUB_TOKEN (the PROJECT_TOKEN secret in Actions) or `gh auth token`.
"""
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import github_api

ROOT = Path(__file__).resolve().parents[2]
STATUSES = ["Candidate", "Ready", "In progress", "Blocked", "Human verification", "Deferred", "Done"]
CLAIM = re.compile(r"<!--\s*gvr-claim\s*-->\s*```json\s*(\{.*?\})\s*```", re.S)
BOARD = re.compile(r"Board status:\s*\**\s*(" + "|".join(re.escape(s) for s in STATUSES) + r")\b", re.I)


def load_config():
    return json.loads((ROOT / "docs/operations/config.json").read_text())


def latest_claim(comments):
    found = None
    for body in comments:
        for match in CLAIM.finditer(body or ""):
            try:
                found = json.loads(match[1])
            except json.JSONDecodeError:
                continue
    return found


def claim_active(claim, now):
    if not claim or claim.get("status") != "active":
        return False
    try:
        expires = datetime.fromisoformat(str(claim.get("expires_at", "")).replace("Z", "+00:00"))
    except ValueError:
        return False
    return expires > now


def desired_fields(issue, now=None):
    """Pure mapping from an issue snapshot to Project field option names."""
    now = now or datetime.now(timezone.utc)
    labels = set(issue.get("labels", []))
    fields = {}
    if issue.get("state") == "CLOSED":
        fields["Status"] = "Done" if issue.get("stateReason") == "COMPLETED" else "Deferred"
    elif claim_active(latest_claim(issue.get("comments", [])), now):
        fields["Status"] = "In progress"
    else:
        match = BOARD.search(issue.get("body") or "")
        if match:
            fields["Status"] = next(s for s in STATUSES if s.lower() == match[1].lower())
        elif "state:ready" in labels:
            fields["Status"] = "Ready"
    for label in labels:
        key, _, value = label.partition(":")
        if key == "lane" and value in ("engine", "product", "joint"):
            fields["Workstream"] = value.capitalize()
        elif key == "kind" and value:
            fields["Kind"] = value.capitalize()
        elif key == "priority" and re.fullmatch(r"p[0-3]", value):
            fields["Priority"] = value.upper()
    return fields


def in_scope(issue):
    return any(label.startswith("lane:") for label in issue.get("labels", []))


ISSUE_FIELDS = """
  id number state stateReason body
  labels(first: 50) { nodes { name } }
  comments(last: 50) { nodes { body } }
  projectItems(first: 20) { nodes { id project { id }
    fieldValues(first: 20) { nodes { ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } } } } } }
"""


def gql(query, variables=None):
    result = github_api.api("graphql", "POST", {"query": query, "variables": variables or {}})
    if result.get("errors"):
        raise RuntimeError("GraphQL: " + "; ".join(e.get("message", "?") for e in result["errors"]))
    return result["data"]


def snapshot(node, project_id):
    item = next((i for i in node["projectItems"]["nodes"] if i["project"]["id"] == project_id), None)
    current = {}
    if item:
        for value in item["fieldValues"]["nodes"]:
            if value and value.get("field") and value.get("name"):
                current[value["field"]["name"]] = value["name"]
    return {
        "id": node["id"],
        "number": node["number"],
        "state": node["state"],
        "stateReason": node.get("stateReason"),
        "body": node.get("body") or "",
        "labels": [l["name"] for l in node["labels"]["nodes"]],
        "comments": [c["body"] for c in node["comments"]["nodes"]],
        "item": item["id"] if item else None,
        "current": current,
    }


def fetch(owner, name, project_id, numbers):
    if numbers:
        issues = []
        for number in numbers:
            data = gql(f"query($o:String!,$n:String!,$i:Int!){{repository(owner:$o,name:$n){{issue(number:$i){{{ISSUE_FIELDS}}}}}}}",
                       {"o": owner, "n": name, "i": number})
            if data["repository"]["issue"]:
                issues.append(snapshot(data["repository"]["issue"], project_id))
        return issues
    issues, after = [], None
    while True:
        data = gql(f"query($o:String!,$n:String!,$a:String){{repository(owner:$o,name:$n){{issues(first:25,after:$a,states:[OPEN,CLOSED]){{pageInfo{{hasNextPage endCursor}} nodes{{{ISSUE_FIELDS}}}}}}}}}",
                   {"o": owner, "n": name, "a": after})
        page = data["repository"]["issues"]
        issues += [snapshot(n, project_id) for n in page["nodes"]]
        if not page["pageInfo"]["hasNextPage"]:
            return issues
        after = page["pageInfo"]["endCursor"]


def plan(issues, field_map, now=None):
    """Return [(issue, field, option)] changes, plus whether the item must be added."""
    changes = []
    for issue in issues:
        if not in_scope(issue):
            continue
        wanted = desired_fields(issue, now)
        for field, option in sorted(wanted.items()):
            if field not in field_map or option not in field_map[field]["options"]:
                continue
            if issue["current"].get(field) != option or not issue["item"]:
                changes.append((issue, field, option))
        if not issue["item"] and not wanted:
            changes.append((issue, None, None))
    return changes


def apply(changes, project_id, field_map):
    added = {}
    for issue, field, option in changes:
        item = issue["item"] or added.get(issue["number"])
        if not item:
            data = gql("mutation($p:ID!,$c:ID!){addProjectV2ItemById(input:{projectId:$p,contentId:$c}){item{id}}}",
                       {"p": project_id, "c": issue["id"]})
            item = added[issue["number"]] = data["addProjectV2ItemById"]["item"]["id"]
            print(f"#{issue['number']}: added to Project")
        if field:
            gql("mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){projectV2Item{id}}}",
                {"p": project_id, "i": item, "f": field_map[field]["id"], "o": field_map[field]["options"][option]})
            print(f"#{issue['number']}: {field} -> {option}")


def probe(owner, name, project):
    """Report what the token can do without changing anything."""
    checks = []

    def check(label, fn):
        try:
            detail = fn()
            checks.append((label, True, detail))
        except Exception as error:  # report every failure, keep probing
            checks.append((label, False, str(error)[:300]))

    check("token identity (GraphQL viewer)", lambda: gql("{viewer{login}}")["viewer"]["login"])
    check("repository read (REST)", lambda: github_api.api(f"repos/{owner}/{name}")["full_name"])
    check("issues read (GraphQL)", lambda: gql("query($o:String!,$n:String!){repository(owner:$o,name:$n){issues{totalCount}}}",
                                                 {"o": owner, "n": name})["repository"]["issues"]["totalCount"])
    check("Project #3 read", lambda: gql("query($p:ID!){node(id:$p){... on ProjectV2{title items{totalCount}}}}",
                                          {"p": project["id"]})["node"])
    check("Project #3 write (no-op title update)", lambda: gql(
        "mutation($p:ID!,$t:String!){updateProjectV2(input:{projectId:$p,title:$t}){projectV2{title}}}",
        {"p": project["id"], "t": project.get("title", "Generative Virtual Runtime")})["updateProjectV2"]["projectV2"]["title"])
    for label, ok, detail in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {label}: {detail}")
    return all(ok for _, ok, _ in checks)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["probe", "dry-run", "sync"], default="dry-run")
    parser.add_argument("--repository", help="owner/name; defaults to GITHUB_REPOSITORY or config")
    parser.add_argument("--issue", type=int, action="append", default=[])
    args = parser.parse_args()
    config = load_config()
    import os
    owner, name = (args.repository or os.environ.get("GITHUB_REPOSITORY") or config["repository"]).split("/")
    project = config["project"]
    if args.mode == "probe":
        sys.exit(0 if probe(owner, name, project) else 1)
    issues = fetch(owner, name, project["id"], args.issue)
    changes = plan(issues, project["field_map"])
    if args.mode == "dry-run":
        for issue, field, option in changes:
            print(f"#{issue['number']}: " + (f"{field} -> {option}" if field else "add to Project"))
        print(f"{len(changes)} change(s) planned across {len(issues)} issue(s)")
        return
    apply(changes, project["id"], project["field_map"])
    print(f"{len(changes)} change(s) applied")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as error:
        if "not accessible by personal access token" in str(error):
            # Read-only token: warn once per run instead of failing every issue event.
            print("::warning::PROJECT_TOKEN cannot write to the Project. Use a classic PAT with the `project` scope "
                  "(fine-grained tokens cannot write user-owned Projects). Run mode `probe` to check.")
            sys.exit(0)
        raise
