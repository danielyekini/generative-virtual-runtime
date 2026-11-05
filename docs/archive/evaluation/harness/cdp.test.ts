import { describe, expect, it, vi } from "vitest";
import { Cdp } from "./cdp";

class FakeSocket extends EventTarget { readyState=1; send(_value:string) {} }
describe("bounded DevTools capture", () => {
  it("rejects pending capture work when the browser closes", async () => {
    const socket=new FakeSocket(); const cdp=new Cdp(socket as unknown as WebSocket);
    const request=cdp.send("Runtime.evaluate"); const assertion=expect(request).rejects.toThrow("socket closed");
    socket.readyState=3; socket.dispatchEvent(new Event("close")); await assertion;
    await expect(cdp.send("Runtime.evaluate")).rejects.toThrow("not open");
  });
  it("times out a lost reply instead of hanging the finite run", async () => {
    vi.useFakeTimers();
    try {
      const cdp=new Cdp(new FakeSocket() as unknown as WebSocket,100);
      const assertion=expect(cdp.send("Page.captureScreenshot")).rejects.toThrow("timeout: Page.captureScreenshot");
      await vi.advanceTimersByTimeAsync(100); await assertion;
    } finally { vi.useRealTimers(); }
  });
});
