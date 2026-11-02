/** Deterministic simulated transport. Four UTF-16 code units = one estimated token,
 * not a provider tokenizer. Worker scheduling/acknowledgement follows PR #11's
 * progressive benchmark; a single unacknowledged chunk bounds producer backlog.
 */
export interface ArrivalOptions {
  rate: number;
  mode: "characters" | "lines" | "tokens" | "random";
  size: number;
  min: number;
  max: number;
  jitter: number;
  stallEvery: number;
  stallMs: number;
  seed: number;
}
export const DEFAULT_ARRIVAL: ArrivalOptions = {
  rate: 60, mode: "tokens", size: 4, min: 4, max: 32,
  jitter: 0, stallEvery: 0, stallMs: 1000, seed: 1,
};

/** Runs in a Worker; kept self-contained so no hidden imports enter its blob. */
export function arrivalProducer(): void {
  const scope = globalThis as unknown as {
    onmessage: (event: MessageEvent) => void;
    postMessage: (data: unknown) => void;
  };
  let source = "", cursor = 0, count = 0, paused = false, pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let options: ArrivalOptions;
  let random = 1;
  const rand = () => { random = (random * 1664525 + 1013904223) >>> 0; return random / 4294967296; };
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  function next(step = false): void {
    if (pending || timer !== undefined || (paused && !step)) return;
    if (cursor >= source.length) { scope.postMessage({ end: true }); return; }
    let size = options.mode === "random"
      ? options.min + Math.floor(rand() * (options.max - options.min + 1))
      : options.size * (options.mode === "tokens" ? 4 : 1);
    let end = Math.min(source.length, cursor + Math.min(16384, size));
    if (options.mode === "lines") {
      end = cursor;
      for (let n = 0; n < options.size && end < source.length; n++) {
        const newline = source.indexOf("\n", end);
        end = newline < 0 ? source.length : newline + 1;
      }
      end = Math.min(end, cursor + 16384);
    }
    // Keep surrogate pairs together at transport boundaries.
    if (end < source.length && /[\uD800-\uDBFF]/.test(source[end - 1]!)) end++;
    const stall = options.stallEvery > 0 && count > 0 && count % options.stallEvery === 0;
    const delay = step || options.rate === 0 ? 0 : (end - cursor) / (options.rate * 4) * 1000 * (1 + (rand() * 2 - 1) * options.jitter / 100) + (stall ? options.stallMs : 0);
    if (stall && !step && options.rate !== 0) scope.postMessage({ stallMs: options.stallMs });
    const deliver = () => {
      timer = undefined;
      pending = true;
      scope.postMessage({ text: source.slice(cursor, end), endOffset: end });
      cursor = end; count++;
    };
    if (delay <= 0) deliver();
    else timer = setTimeout(deliver, delay);
  }
  scope.onmessage = ({ data }) => {
    if (data.start) {
      clear(); source = data.source; options = data.options; random = options.seed >>> 0;
      cursor = 0; count = 0; pending = false; paused = false; next();
    } else if (data.ack) { pending = false; next(); }
    else if (data.pause !== undefined) { paused = data.pause; clear(); next(); }
    else if (data.step) { paused = true; clear(); next(true); }
  };
}

export function createArrival(source: string, options: ArrivalOptions, receive: (data: { text?: string; endOffset?: number; end?: boolean; stallMs?: number }) => void): Worker {
  const url = URL.createObjectURL(new Blob([`(${arrivalProducer.toString()})()`], { type: "text/javascript" }));
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  worker.onmessage = ({ data }) => {
    receive(data);
    if (data.text !== undefined) worker.postMessage({ ack: true });
  };
  worker.postMessage({ start: true, source, options });
  return worker;
}
