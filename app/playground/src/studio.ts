import { createStage } from "./activities/stage";
import { createWorkspace } from "./activities/workspace";
import type { GvrBridge } from "./bridge";
import { isTypingTarget } from "./bridge";
import { Shell } from "./shell";

type Surface = "studio" | "stage";

interface Activity {
  activate(extra?: string): void;
  deactivate(): void;
  tick(now: number, delta: number): void;
  draw(): void;
  key(event: KeyboardEvent): boolean;
  hook(): Partial<GvrBridge>;
}

const shell = new Shell();
const activities: Record<Surface, Activity> = {
  studio: createWorkspace(shell),
  stage: createStage(shell),
};

let activeId: Surface = "studio";
let active: Activity = activities.studio;
let booted = false;
let lastWall = performance.now();
const productTitle = document.querySelector<HTMLElement>("#product-title");
const modeSwitch = document.querySelector<HTMLButtonElement>("#mode-switch");

function readLocation(): { id: Surface; extra: string } {
  const raw = location.hash.replace(/^#/, "");
  const [head = "", ...rest] = raw.split("/").filter(Boolean);
  if (head === "stage") return { id: "stage", extra: "" };
  if (head === "stream") return { id: "studio", extra: "stream" };
  if (head === "import") return { id: "studio", extra: rest[0] === "split" ? "import/split" : "import" };
  if (head === "studio") return { id: "studio", extra: rest.join("/") };
  return { id: "studio", extra: "" };
}

function publish(): void {
  window.__gvr = {
    activity: activeId,
    canvas: shell.primaryCanvas(),
    ...active.hook(),
  };
}

function show(next: { id: Surface; extra: string }): void {
  const switching = booted && activeId !== next.id;
  if (switching) active.deactivate();
  booted = true;
  shell.resetChrome();
  activeId = next.id;
  active = activities[next.id];
  document.body.dataset.surface = next.id;
  document.querySelector("#tools")?.toggleAttribute("inert", next.id === "stage");
  document.querySelector("#dock")?.toggleAttribute("inert", next.id === "stage");
  if (switching) {
    document.body.classList.add("is-switching");
    window.setTimeout(() => document.body.classList.remove("is-switching"), 650);
  }
  document.title = next.id === "stage" ? "GVR" : "GVR Studio";
  if (productTitle) productTitle.textContent = next.id === "stage" ? "Stage" : "Studio";
  if (modeSwitch) modeSwitch.textContent = next.id === "stage" ? "Studio" : "Stage";
  active.activate(next.extra);
  lastWall = performance.now();
  active.draw();
  publish();
}

modeSwitch?.addEventListener("click", () => {
  const next = activeId === "stage" ? "studio" : "stage";
  if (location.hash === `#${next}`) show({ id: next, extra: "" });
  else location.hash = next;
});

window.addEventListener("hashchange", () => show(readLocation()));

window.addEventListener("keydown", (event) => {
  if (isTypingTarget(event.target)) return;
  if (active.key(event)) return;
  shell.onTransportKey(event);
});

new ResizeObserver(() => active.draw()).observe(shell.stage);
new ResizeObserver(() => active.draw()).observe(shell.paneA);
new ResizeObserver(() => active.draw()).observe(shell.paneB);

if (!location.hash || location.hash === "#") history.replaceState(null, "", "#studio");
show(readLocation());

requestAnimationFrame(function loop(now: number) {
  const delta = Math.min(100, now - lastWall);
  lastWall = now;
  active.tick(now, delta);
  active.draw();
  publish();
  requestAnimationFrame(loop);
});

declare global {
  interface Window {
    __gvr?: GvrBridge;
  }
}
