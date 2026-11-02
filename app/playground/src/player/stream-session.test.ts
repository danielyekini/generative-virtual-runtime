import { describe, expect, it } from "vitest";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { StreamSession } from "./stream-session";

const source = `scene "stream-test" {
  version "0.1";
  viewport (400, 300);
  background #101014;
  duration 2s;
};
circle c { radius 10; fill #ffffff; };
animate c.position.x { from 0; to 100; duration 1s; };
seal 1s;
animate c.position.x { from 100; to 200; start 1s; duration 1s; };
seal 2s;
complete;`;

describe("Player current-source streaming adapter", () => {
  it("preserves exact arrived text and holds playback until a real seal", () => {
    const session = new StreamSession(source);
    session.push(source.slice(0, 12));
    expect(session.segments().map(s => s.text).join("")).toBe(source.slice(0, 12));
    expect(session.segments().every(s => s.state === "arrived")).toBe(true);
    session.clock.tick(1000);
    expect(session.observation.waitingForContent).toBe(true);
    expect(session.clock.timeMs).toBe(0);
    for (let n = 12; n < source.length; n += 7) session.push(source.slice(n, n + 7));
    session.finish();
    expect(session.diagnostics).toEqual([]);
    expect(session.observation.authoringComplete).toBe(true);
    expect(session.segments().map(s => s.text).join("")).toBe(source);
    session.evaluate();
    expect(session.segments().some(s => s.state === "queued")).toBe(true);
    const offline = compileMotionScript(source);
    expect(offline.ok).toBe(true);
    const runtime = new AnimationRuntime(offline.scene!);
    for (const time of [0, 500, 1000, 1500, 2000]) {
      session.clock.seek(time);
      expect({ ...session.evaluate(), revision: 0 }).toEqual({ ...runtime.evaluate(time), revision: 0 });
    }
    expect(session.segments().some(s => s.state === "queued")).toBe(false);
    session.clock.seek(0); session.evaluate();
    expect(session.segments().some(s => s.state === "queued")).toBe(true);
  });
  it("marks actual diagnostic spans red without replacing failed source", () => {
    const broken = source.replace("#ffffff", "#zz");
    const session = new StreamSession(broken);
    session.push(broken); session.finish();
    expect(session.diagnostics.length).toBeGreaterThan(0);
    expect(session.segments().some(s => s.state === "rejected")).toBe(true);
    expect(session.segments().map(s => s.text).join("")).toBe(broken);
  });
  it("keeps UTF-16 source spans distinct from UTF-8 byte counters", () => {
    const unicode = source.replace('stream-test', 'stream-🌙');
    const session = new StreamSession(unicode);
    for (const character of unicode) session.push(character);
    session.finish();
    expect(session.cursor).toBe(unicode.length);
    expect(session.observation.receivedBytes).toBe(new TextEncoder().encode(unicode).length);
    expect(session.segments().map(s => s.text).join("")).toBe(unicode);
  });
  it("cancels the engine owners and cannot affect a replacement session", () => {
    const old = new StreamSession(source);
    old.push(source); old.finish(); old.dispose();
    const fresh = new StreamSession(source);
    expect(old.observation.cancelled).toBe(true);
    expect(fresh.observation.appliedRevision).toBe(0);
    expect(fresh.cursor).toBe(0);
  });
});
