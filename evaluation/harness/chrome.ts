/**
 * Resolve the Chromium-based browser used for fidelity captures.
 *
 * Order:
 * 1. GVR_CHROME or CHROME_PATH (absolute path or command name on PATH)
 * 2. Well-known macOS / Linux locations
 *
 * Cloud / Linux agents should install Chromium or Chrome and either rely on
 * discovery or set GVR_CHROME explicitly. Do not silently substitute a different
 * major without recording it in the run environment / loop.json.
 */
import { accessSync, constants, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
];

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return existsSync(path);
  }
}

function which(command: string): string | undefined {
  try {
    const out = execFileSync("sh", ["-c", `command -v ${JSON.stringify(command)}`], {
      encoding: "utf8",
    }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

export function resolveChromeBinary(): string {
  const fromEnv = process.env.GVR_CHROME?.trim() || process.env.CHROME_PATH?.trim();
  if (fromEnv) {
    if (fromEnv.includes("/") || fromEnv.includes("\\")) {
      if (!isExecutable(fromEnv)) {
        throw new Error(`GVR_CHROME / CHROME_PATH is not executable: ${fromEnv}`);
      }
      return fromEnv;
    }
    const resolved = which(fromEnv);
    if (!resolved) {
      throw new Error(`GVR_CHROME / CHROME_PATH command not found on PATH: ${fromEnv}`);
    }
    return resolved;
  }

  for (const candidate of CANDIDATES) {
    if (isExecutable(candidate)) return candidate;
  }
  for (const name of ["google-chrome-stable", "google-chrome", "chromium-browser", "chromium"]) {
    const resolved = which(name);
    if (resolved) return resolved;
  }

  throw new Error(
    "No Chrome/Chromium binary found. Install Chrome or Chromium, or set GVR_CHROME to an absolute path.",
  );
}

export function chromeVersion(binary: string): string {
  try {
    return execFileSync(binary, ["--version"], { encoding: "utf8" }).trim();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
