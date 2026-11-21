/** Bound local DevTools requests and fail pending work when Chrome disappears. */
export class Cdp {
  private id = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  constructor(private socket: WebSocket, private timeoutMs = 15000) {
    socket.addEventListener("message", event => {
      const message = JSON.parse(String(event.data));
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id); clearTimeout(waiter.timer);
      if (message.error) waiter.reject(new Error(message.error.message)); else waiter.resolve(message.result);
    });
    const closed = () => {
      for (const waiter of this.pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error("Chrome DevTools socket closed")); }
      this.pending.clear();
    };
    socket.addEventListener("close", closed);
    socket.addEventListener("error", closed);
  }
  send(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<any> {
    if (this.socket.readyState !== 1) return Promise.reject(new Error("Chrome DevTools socket is not open"));
    const id = ++this.id;
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Chrome DevTools timeout: ${method}`)); },this.timeoutMs);
      this.pending.set(id,{resolve,reject,timer});
      try { this.socket.send(JSON.stringify({id,method,params,sessionId})); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }
}
