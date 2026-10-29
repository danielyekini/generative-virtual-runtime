/** Inside an Order Book — deterministic 35s story plate.
 * Run: npx tsx fixtures/motionscript/stories/build-inside-an-order-book.ts
 * Optional real CanvasRenderer PNGs: GVR_PREVIEW_DIR=work/order-book-preview <command>
 * No preview files, browser, or server are created without GVR_PREVIEW_DIR.
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { compileMotionScript } from "@gvr/compiler";
import { AnimationRuntime } from "@gvr/runtime";
import { DEFAULT_LIMITS, transformPoint, validateSceneIR, type ResolvedDrawItem, type SceneIR } from "@gvr/schema";
import { Cdp } from "../../../evaluation/harness/cdp";
import { chromeVersion, resolveChromeBinary } from "../../../evaluation/harness/chrome";

const started = performance.now();
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const BUY = "#40d9bb", SELL = "#ff867a", AMBER = "#ffcb70", INK = "#f0f4fc", MUTED = "#9faec5";
const motion: string[] = [];
const nodes: string[] = [];
type Key = [seconds: number, value: number, ease?: string];
function track(target: string, keys: Key[]): void {
  const map = new Map<number, Key>(keys.map(k => [k[0], k]));
  const list = [...map.values()].sort((a,b) => a[0]-b[0]);
  if (list[0]![0] > 0) list.unshift([0, list[0]![1], "hold"]);
  if (list.at(-1)![0] < 35) list.push([35, list.at(-1)![1]]);
  motion.push(`keyframes ${target} {\n  start 0s; duration 35s;\n${list.map(([t,v,e],i) => `  ${(t/35*100).toFixed(9)}% ${v}${i < list.length-1 ? ` ease ${e ?? "hold"}` : ""};`).join("\n")}\n};`);
}
function windowed(id: string, from: number, until = 36): void {
  motion.push(`step ${id}.visible { at ${Math.round(from*1000)}ms; value true; };`);
  if (until <= 35) motion.push(`step ${id}.visible { at ${Math.round(until*1000)}ms; value false; };`);
}
function text(id: string, x: number, y: number, words: string, size = 18, color = INK, extra = ""): string {
  return `text ${id} { position (${x}, ${y}); content ${JSON.stringify(words)}; fontFamily "sans-serif"; fontSize ${size}; fontWeight 600; align left; baseline middle; fill ${color}; ${extra} };`;
}
function rect(id: string, x: number, y: number, w: number, h: number, color: string, edge = "#283c58", extra = ""): string {
  return `rectangle ${id} { position (${x}, ${y}); size (${w}, ${h}); cornerRadius 6; fill ${color}; stroke ${edge} width 1.2; ${extra} };`;
}
function label(id: string, words: string, x: number, y: number, from: number, until = 36, size = 18, color = INK, extra = ""): void {
  nodes.push(text(id,x,y,words,size,color,`visible false; ${extra}`));
  windowed(id,from,until);
}
function row(id: string, x: number, y: number, price: string, color: string, from: number, until: number, quantities: [number,number,string][], orderId?: string): void {
  nodes.push(`group ${id} { position (${x}, ${y}); visible false;
    ${rect("plate",0,0,390,56,"#11243a",color)}
    ${text("priceLabel",18,28,price,25,color)}
    ${orderId ? text("orderId",317,28,orderId,16,color) : ""}
    ${id === "ask101" || id === "ask102" ? (() => { windowed(`${id}.bestMark`,id === "ask101" ? 4 : 18,id === "ask101" ? 18 : 36); return `line bestMark { from (3, 8); to (3, 48); stroke ${SELL} width 4; visible false; };`; })() : ""}
    ${quantities.map(([a,b,q],i) => { windowed(`${id}.qty${i}`,a,b); return text(`qty${i}`,170,28,`${q} units`,22,INK,"visible false;"); }).join("\n")}
  };`);
  windowed(id,from,until);
}
function arrival(id: string, words: string, color: string, a: number, b: number, x: number, y: number): void {
  nodes.push(`group ${id} { position (350, 140); zIndex 20; visible false;
    ${rect("plate",0,0,390,46,"#152b43",color)}
    ${text("words",14,23,words,18,color)}
  };`);
  windowed(id,a,b);
  track(`${id}.position.x`,[[0,350],[a,350,"easeInOut"],[b,x]]);
  track(`${id}.position.y`,[[0,140],[a,140,"easeInOut"],[b,y]]);
}
function pulse(id: string, x: number, y: number, a: number, b: number): void {
  nodes.push(rect(id,x,y,390,56,"#714d21",AMBER,"opacity 0; zIndex 6;"));
  track(`${id}.opacity`,[[0,0],[a,0.12,"easeOut"],[a+0.25,0.55,"easeInOut"],[b-0.1,0.12],[b,0]]);
}
function program(): string {
  nodes.push(text("storyTitle",40,45,"Inside an Order Book",30));
  nodes.push(text("principle",40,83,"CONTINUOUS TRADING  /  PRICE–TIME PRIORITY",13,MUTED));
  nodes.push(rect("bidPanel",30,200,410,230,"#0d192b"));
  nodes.push(rect("askPanel",470,200,410,230,"#0d192b"));
  nodes.push(rect("tapePanel",920,110,330,510,"#0d192b"));
  nodes.push(text("bidHeading",48,222,"BUY / BIDS",20,BUY,"zIndex 30;"));
  nodes.push(text("askHeading",488,222,"SELL / ASKS",20,SELL,"zIndex 30;"));
  nodes.push(text("tapeHeading",942,139,"TRADE TAPE",20,AMBER));
  nodes.push(text("tapeHint",942,173,"Resting price · units",14,MUTED));
  label("emptyTape","No executions yet",942,218,0,11,17,MUTED);
  row("bid99",40,250,"99.00",BUY,1,24,[[1,6,"100"],[6,11,"160"],[11,13,"60"],[13,24,"30"]]);
  row("bid98",40,320,"98.00",BUY,2,36,[[2,36,"80"]]);
  row("ask101",480,250,"101.00",SELL,3,18,[[3,18,"70"]]);
  row("ask102",480,320,"102.00",SELL,4,36,[[4,20,"120"],[20,36,"90"]],"S2");
  track("ask102.position.y",[[0,320],[18,320,"easeInOut"],[18.8,250]]);
  row("bid100",40,250,"100.00",BUY,29,36,[[29,36,"50"]]);
  arrival("arriveB1","B1: Buy 100 at 99.00",BUY,0,1,40,250);
  arrival("arriveB2","B2: Buy 80 at 98.00",BUY,1,2,40,320);
  arrival("arriveS1","S1: Sell 70 at 101.00",SELL,2,3,480,250);
  arrival("arriveS2","S2: Sell 120 at 102.00",SELL,3,4,480,320);
  arrival("arriveB3","B3: Buy 60 at 99.00",BUY,5,6,40,250);
  arrival("arriveB4","B4: Buy 50 at 100.00",BUY,27,29,40,250);
  label("idB1","B1",357,278,1,6,16,BUY);
  label("idQueue","B1 → B3",322,278,6,11,15,BUY);
  label("idB3","B3",357,278,11,24,16,BUY);
  label("idB2","B2",357,348,2,36,16,BUY);
  label("idS1","S1",797,278,3,18,16,SELL);
  label("idB4","B4",357,278,29,36,16,BUY);
  // Bracket between ladder columns; its labelled base is below both ladders.
  nodes.push(`path spreadBracket { move (425, 400); line (425, 412); line (495, 412); line (495, 400); stroke ${INK} width 1.5; };`);
  nodes.push(`line bestBidMark { from (43, 258); to (43, 298); stroke ${BUY} width 4; visible false; };`);
  nodes.push(`line bestBidLowerMark { from (43, 328); to (43, 368); stroke ${BUY} width 4; visible false; };`);
  nodes.push(`line bestBidFinalMark { from (43, 258); to (43, 298); stroke ${BUY} width 4; visible false; };`);
  windowed("bestBidMark",4,24); windowed("bestBidLowerMark",24,29);
  windowed("bestBidFinalMark",29);
  label("spread2a","Spread: 2.00",378,448,4,18,20);
  label("spread3","Spread: 3.00",378,448,18,24,20);
  label("spread4","Spread: 4.00",378,448,24,29,20);
  label("spread2b","Spread: 2.00",378,448,29,36,20);
  label("bestInitial","Best bid 99.00  /  Best ask 101.00",40,390,4,18,16);
  label("bestMarket","Best bid 99.00  /  Best ask 102.00",40,390,18,24,16);
  label("bestCancel","Best bid 98.00  /  Best ask 102.00",40,390,24,29,16);
  label("bestFinal","Best bid 100.00  /  Best ask 102.00",40,390,29,36,16);
  label("detailHeading","ORDER DETAIL · 99.00 BID · EARLIEST FIRST",40,480,6,24,13,MUTED);
  nodes.push(`group queueB1 { position (40, 500); visible false;
    ${rect("plate",0,0,190,46,"#102d30",BUY)} ${text("words",14,23,"B1: 100",20,BUY)}
  };`);
  windowed("queueB1",6,11);
  label("queueArrow","→",244,523,6,11,25,BUY);
  nodes.push(`group queueB3 { position (600, 500); visible false;
    ${rect("plate",0,0,220,46,"#102d30",BUY)}
    ${text("fullQty",14,23,"B3: 60",20,BUY,"visible false;")}
    ${text("partialQty",14,23,"B3: 30 of 60",20,BUY,"visible false;")}
    line strikeQty { from (48, 24); to (172, 24); stroke ${SELL} width 2; visible false; };
  };`);
  windowed("queueB3",6,24);
  windowed("queueB3.fullQty",6,13);
  windowed("queueB3.partialQty",13,24);
  windowed("queueB3.strikeQty",23,24);
  track("queueB3.position.x",[[0,600],[6,600,"easeInOut"],[7,280],[11,280,"easeInOut"],[12,40]]);
  label("queueRule","Earlier orders first at the same price.",40,574,7,11,19);
  label("partialLabel","Partially filled",40,574,13,22,19,BUY);
  label("sell130","S3: Sell 130, limit 99.00",40,149,9,11,22,SELL);
  label("sell30","S3: 30 remaining · limit 99.00",40,149,11,13,22,SELL);
  label("sellFilled","S3: 0 remaining · Filled",40,149,13,14,22,AMBER);
  label("sellMatch","Sell limit ≤ best bid: match.",40,181,9,14,17,AMBER);
  track("sellMatch.opacity",[[0,1],[13.4,1,"easeInOut"],[14,0]]);
  label("market100","M1: Market buy 100",40,149,15,18,22,BUY);
  label("market30","M1: 30 remaining",40,149,18,20,22,BUY);
  label("marketFilled","M1: 0 remaining · Filled",40,149,20,21,22,AMBER);
  label("cancelRequest","Cancel B3: remaining 30",40,149,22,24,22,SELL);
  label("cancelled","B3 cancelled · 30 withdrawn",40,574,24,27,19,MUTED);
  nodes.push(rect("cancelOutline",38,498,224,50,"#102d30",SELL,"visible false;"));
  windowed("cancelOutline",22,24);
  // The outline paints before the queue; the strike paints after its text.
  const outline = nodes.pop()!; nodes.splice(nodes.findIndex(n => n.startsWith("group queueB3")),0,outline);
  const executions: [string,number,string,string][] = [
    ["trade1",11,"100 at 99.00","S3 × B1"], ["trade2",13,"30 at 99.00","S3 × B3"],
    ["trade3",18,"70 at 101.00","M1 × S1"], ["trade4",20,"30 at 102.00","M1 × S2"],
  ];
  executions.forEach(([id,t,words,ids],i) => {
    label(id,words,942,223+i*88,t,36,23,AMBER);
    label(`${id}Ids`,`${ids} · units`,942,252+i*88,t,36,14,MUTED);
  });
  pulse("sellPulse1",40,250,9,11); pulse("sellPulse2",40,250,11,13);
  pulse("askPulse1",480,250,16,18); pulse("askPulse2",480,320,18,20);
  track("askPulse2.position.y",[[0,320],[18,320,"easeInOut"],[18.8,250]]);
  label("execution1","Executing 100 at 99.00 · B1",520,574,9,11,18,AMBER);
  label("execution2","Executing 30 at 99.00 · B3",520,574,11,13,18,AMBER);
  label("execution3","Executing 70 at 101.00 · S1",520,574,16,18,18,AMBER);
  label("execution4","Executing 30 at 102.00 · S2",520,574,18,20,18,AMBER);
  label("finalRest","Rest: wait in the book",40,504,31,36,20);
  label("finalMatch","Match: execute compatible orders",40,548,32,36,20);
  label("finalCancel","Cancel: withdraw the remainder.",40,592,33,36,20);
  nodes.push(`group footer { space screen;
    ${rect("plate",30,648,1220,48,"#122239")}
  };`);
  label("captionRest","Limit orders wait for a compatible price.",48,672,0,5,20,INK,"space screen;");
  label("captionQueue","Same price: join the queue. No trade occurs.",48,672,5,9,20,INK,"space screen;");
  label("captionSell","Price first, then time. Trades use the resting order’s price.",48,672,9,15,20,INK,"space screen;");
  label("captionMarket","Take the lowest available sell price first.",48,672,15,22,20,INK,"space screen;");
  label("captionCancel","Cancellation removes the unfilled remainder.",48,672,22,27,20,INK,"space screen;");
  label("captionImprove","A better bid can narrow the spread without a trade.",48,672,27,31,20,INK,"space screen;");
  label("captionFinal","Four executions. Two resting bids. One resting ask.",48,672,31,36,20,INK,"space screen;");
  // Keep the full tape in frame during small changes of emphasis.
  track("camera(main).zoom",[[0,1],[5,1,"easeInOut"],[6,1.025],[8,1.025,"easeInOut"],[9,1],[15,1,"easeInOut"],[16,1.015],[21,1.015,"easeInOut"],[22,1],[27,1],[35,1]]);
  return `// Generated by build-inside-an-order-book.ts. Never edit by hand.
// Visual timeline only; the current contract has no audio events.
scene "inside-an-order-book" {
  version "0.2"; viewport (1280, 720); background #070f20; duration 35s;
  requires "easing.hold"; requires "geometry.roundedRect"; requires "text.basic";
};
camera main { position (640, 360); zoom 1; rotation 0deg; };
${nodes.join("\n")}
${motion.join("\n")}
complete;
`;
}

function assertFrames(scene: SceneIR): number {
  const runtime = new AnimationRuntime(scene);
  const frame = (t: number) => runtime.evaluate(t*1000).drawItems;
  let checks = 0;
  const expect = (condition: boolean, message: string) => { checks++; if (!condition) throw new Error(message); };
  function get(t: number, id: string): ResolvedDrawItem {
    const item = frame(t).find(d => d.nodeId === id);
    if (!item) throw new Error(`Missing draw item ${id} at ${t}s`);
    return item;
  }
  const visible = (t: number, id: string, yes = true) => expect((frame(t).find(d => d.nodeId === id)?.opacity === 1) === yes, `${id} visibility at ${t}s`);
  const content = (t: number, id: string, words: string) => {
    visible(t,id); const item = get(t,id);
    expect(item.geometry.kind === "text" && item.geometry.content === words, `${id} text at ${t}s`);
  };
  // Independently written expected states, checked against evaluated draw items.
  for (const [t,id,words] of [
    [1,"bid99.qty0","100 units"],[2,"bid98.qty0","80 units"],[3,"ask101.qty0","70 units"],[4,"ask102.qty0","120 units"],
    [6,"bid99.qty1","160 units"],[7,"queueB1.words","B1: 100"],[7,"queueB3.fullQty","B3: 60"],
    [9,"sell130","S3: Sell 130, limit 99.00"],[11,"sell30","S3: 30 remaining · limit 99.00"],
    [11,"bid99.qty2","60 units"],[13,"bid99.qty3","30 units"],[13,"queueB3.partialQty","B3: 30 of 60"],
    [13,"sellFilled","S3: 0 remaining · Filled"],[15,"market100","M1: Market buy 100"],
    [18,"market30","M1: 30 remaining"],[20,"marketFilled","M1: 0 remaining · Filled"],[20,"ask102.qty1","90 units"],
    [20,"spread3","Spread: 3.00"],[22,"cancelRequest","Cancel B3: remaining 30"],
    [24,"spread4","Spread: 4.00"],[29,"bid100.qty0","50 units"],[29,"spread2b","Spread: 2.00"],
    [31,"finalRest","Rest: wait in the book"],[32,"finalMatch","Match: execute compatible orders"],
    [33,"finalCancel","Cancel: withdraw the remainder."],[35,"bestFinal","Best bid 100.00  /  Best ask 102.00"],
  ] as [number,string,string][]) content(t,id,words);
  for (const [id,from] of [["trade1",11],["trade2",13],["trade3",18],["trade4",20]] as [string,number][]) {
    visible(from-0.01,id,false); visible(from,id); visible(35,id);
  }
  visible(8,"trade1",false); visible(11,"queueB1.words",false);
  visible(13,"sell130",false); visible(14,"sellFilled",false);
  visible(18,"ask101.plate",false); visible(21,"marketFilled",false);
  visible(23,"queueB3.strikeQty"); visible(24,"queueB3.plate",false); visible(24,"bid99.plate",false);
  for (const t of [22,23,24,25,26,27,29,31,35]) {
    expect(frame(t).filter(d => /^trade[1-4]$/.test(d.nodeId) && d.opacity > 0.99).length === 4, `Tape changes during cancellation or later at ${t}s`);
  }
  const b1 = transformPoint(get(7,"queueB1.words").logicalMatrix,0,0);
  const b3 = transformPoint(get(7,"queueB3.fullQty").logicalMatrix,0,0);
  expect(b3.x > b1.x + 200 && Math.abs(b3.y-b1.y)<1, "B3 must queue behind B1");
  for (const [t,id,x,y] of [[4,"bid99.priceLabel",58,278],[4,"ask101.priceLabel",498,278],
    [24,"bid98.priceLabel",58,348],[29,"bid100.priceLabel",58,278],[35,"ask102.priceLabel",498,278]] as [number,string,number,number][]) {
    const p = transformPoint(get(t,id).logicalMatrix,0,0);
    expect(Math.hypot(p.x-x,p.y-y)<0.1, `${id} in wrong position at ${t}s`);
  }
  for (const t of [0,5,9,15,22,27,31,35]) {
    for (const id of ["bidHeading","askHeading","tapeHeading"]) visible(t,id);
  }
  // Sweep visible text anchors and rectangle corners, including moving arrivals.
  // Browser capture additionally measures actual glyph bounds (not guessed text widths).
  for (let tick=0; tick<=350; tick++) {
    for (const item of frame(tick/10)) {
      if (item.opacity < 0.01 || item.nodeId.startsWith("footer.")) continue;
      const g = item.geometry;
      if (g.kind !== "text" && g.kind !== "rectangle") continue;
      const points = g.kind === "rectangle" ? [[0,0],[g.size.x,g.size.y]] : [[0,0]];
      for (const [x,y] of points) {
        const p = transformPoint(item.logicalMatrix,x!,y!);
        const footer = item.nodeId.startsWith("caption");
        expect(p.x >= 10 && p.x <= 1270 && p.y >= 10 && p.y <= (footer ? 704 : 638), `${item.nodeId} off screen / inside caption area at ${tick/10}s (${p.x},${p.y})`);
      }
    }
  }
  // Shuffled seeks must reproduce identical resolved data, independent of prior evaluation.
  for (const t of [35,11,0,24,7,18,29,13,5]) {
    expect(JSON.stringify(frame(t)) === JSON.stringify(new AnimationRuntime(scene).evaluate(t*1000).drawItems), `Seek history affects ${t}s`);
  }
  for (const [id,words] of [["trade1","100 at 99.00"],["trade2","30 at 99.00"],["trade3","70 at 101.00"],["trade4","30 at 102.00"],
    ["bid100.qty0","50 units"],["bid98.qty0","80 units"],["ask102.qty1","90 units"]]) content(35,id!,words!);
  for (const [t,id] of [[0.1,"arriveB1.words"],[1.1,"arriveB2.words"],[2.1,"arriveS1.words"],[3.1,"arriveS2.words"],[5.1,"arriveB3.words"],[27.1,"arriveB4.words"]] as [number,string][]) visible(t,id);
  for (const t of [6,6.25,6.5,6.75,7]) {
    const p = transformPoint(get(t,"queueB3.plate").logicalMatrix,0,0);
    const q = transformPoint(get(t,"queueB1.plate").logicalMatrix,190,46);
    expect(p.x > q.x + 10, `Queue cards overlap at ${t}s`);
  }
  for (const t of [18,18.2,18.5,18.8,19]) {
    visible(t,"ask102.orderId");
    const a = transformPoint(get(t,"ask102.plate").logicalMatrix,0,0);
    const b = transformPoint(get(t,"askPulse2").logicalMatrix,0,0);
    expect(Math.hypot(a.x-b.x,a.y-b.y)<0.1, `S2 pulse detaches at ${t}s`);
  }
  visible(18,"ask102.bestMark"); visible(18,"ask101.bestMark",false);
  for (const t of [0.5,1.5,2.5,3.5,5.5,28]) {
    const id = t < 1 ? "arriveB1" : t < 2 ? "arriveB2" : t < 3 ? "arriveS1" : t < 4 ? "arriveS2" : t < 6 ? "arriveB3" : "arriveB4";
    visible(t,`${id}.words`);
  }
  return checks;
}

// Every beat boundary, arrival/execution boundary and important hold/pulse/strike.
const stillTimes = [0,0.5,1,2,3,4,5,5.5,6,6.5,7,8,9,9.3,10,11,11.3,12,13,14,15,15.5,16,16.3,17,18,18.5,19,19.3,20,21,22,23,23.5,24,25.5,27,28,29,30,31,32,33,34,35];
async function previews(scene: SceneIR, directory: string): Promise<void> {
  const { createServer } = await import("vite");
  const out = resolve(directory); mkdirSync(out,{recursive:true});
  const profile = resolve(out,"chromium-profile");
  const server = await createServer({configFile:false,root:repo,appType:"custom",optimizeDeps:{noDiscovery:true,include:[]},server:{host:"127.0.0.1",port:0}});
  server.middlewares.use((request,response,next) => {
    if (request.url !== "/" && request.url !== "/index.html") return next();
    response.setHeader("Content-Type","text/html");
    response.end('<!doctype html><html><head><title>Order book capture</title></head><body></body></html>');
  });
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === "string") throw new Error("Missing Vite address");
  const binary = resolveChromeBinary();
  const chrome = spawn(binary,["--headless","--no-sandbox","--disable-dev-shm-usage","--remote-debugging-port=0",`--user-data-dir=${profile}`,"about:blank"],{stdio:["ignore","ignore","pipe"]});
  let socket: WebSocket | undefined;
  try {
    const endpoint = await new Promise<string>((resolveEndpoint,reject) => {
      let output = "";
      const timer = setTimeout(() => reject(new Error(`Chrome start timeout: ${output.slice(-1000)}`)),15000);
      chrome.on("error",e => {clearTimeout(timer);reject(e);});
      chrome.stderr!.on("data",chunk => {output+=String(chunk);const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolveEndpoint(match[1]!);}});
    });
    socket = new WebSocket(endpoint);
    await new Promise<void>((r,j) => {socket!.addEventListener("open",()=>r(),{once:true});socket!.addEventListener("error",()=>j(new Error("CDP socket failed")),{once:true});});
    const cdp = new Cdp(socket);
    const {targetId} = await cdp.send("Target.createTarget",{url:"about:blank"});
    const {sessionId} = await cdp.send("Target.attachToTarget",{targetId,flatten:true});
    const evaluate = async (expression: string) => {
      const result = await cdp.send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true},sessionId);
      if(result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    console.log(`Preview HTTP ${address.port}: ${(await fetch(`http://127.0.0.1:${address.port}/`)).status}`);
    const navigation = await cdp.send("Page.navigate",{url:`http://127.0.0.1:${address.port}/`},sessionId);
    if(navigation.errorText) throw new Error(`Preview navigation: ${navigation.errorText}`);
    // Wait for navigation before dynamic imports so their origin is the Vite server.
    for(let i=0;i<100;i++) {
      if(await evaluate("location.origin") === `http://127.0.0.1:${address.port}`) break;
      await new Promise(r=>setTimeout(r,50));
    }
    await evaluate(`(async () => {
      const {CanvasRenderer} = await import('/packages/canvas-renderer/src/index.ts');
      const {AnimationRuntime} = await import('/packages/runtime/src/index.ts');
      document.body.innerHTML = '<canvas></canvas>';
      const canvas = document.querySelector('canvas');
      const renderer = new CanvasRenderer(canvas); renderer.resize(1280,720,1);
      const runtime = new AnimationRuntime(${JSON.stringify(scene)});
      await document.fonts.ready;
      window.captureStory = (seconds) => {
        const frame = runtime.evaluate(seconds*1000); renderer.render(frame);
        const context = canvas.getContext('2d');
        const issues = [];
        for (const item of frame.drawItems) {
          if(item.opacity < 0.01 || item.geometry.kind !== 'text' || !item.geometry.content) continue;
          const g = item.geometry; context.font = g.font.weight + ' ' + g.font.size + 'px ' + g.font.family;
          const width = context.measureText(g.content).width;
          const m = item.logicalMatrix, x = m[6], y = m[7], scale = m[0];
          const limit = item.nodeId.startsWith('caption') ? 704 : 638;
          if(x < 10 || x + width*scale > 1270 || y-g.font.size*scale/2 < 10 || y+g.font.size*scale/2 > limit) issues.push(item.nodeId);
        }
        return {png:canvas.toDataURL('image/png'),issues};
      };
    })()`);
    for(const t of stillTimes) {
      const shot = await evaluate(`window.captureStory(${t})`);
      if(shot.issues.length) throw new Error(`Glyph bounds fail at ${t}s: ${shot.issues.join(', ')}`);
      writeFileSync(resolve(out,`f${t.toFixed(1).padStart(4,"0")}.png`),Buffer.from(shot.png.split(",")[1],"base64"));
    }
    writeFileSync(resolve(out,"capture.json"),JSON.stringify({renderer:"CanvasRenderer",browser:chromeVersion(binary),times:stillTimes,glyphBounds:"pass"},null,2)+"\n");
    console.log(`Captured ${stillTimes.length} CanvasRenderer PNGs in ${out}`);
  } finally {
    socket?.close(); chrome.kill(); await server.close();
    await new Promise<void>(r => { if(chrome.exitCode!==null || chrome.signalCode!==null) r(); else chrome.once("exit",()=>r()); });
    rmSync(profile,{recursive:true,force:true});
  }
}
async function main(): Promise<void> {
  const source = program();
  writeFileSync(resolve(here,"inside-an-order-book.ms"),source);
  const compileStart = performance.now(); const compiled = compileMotionScript(source);
  const compileMs = performance.now()-compileStart;
  if (!compiled.ok || !compiled.scene || compiled.diagnostics.length) throw new Error(JSON.stringify(compiled.diagnostics));
  const validated = validateSceneIR(compiled.scene);
  if (!validated.ok) throw new Error(JSON.stringify(validated.diagnostics));
  const scene = compiled.scene;
  const checks = assertFrames(scene);
  const measurements = {sourceBytes:Buffer.byteLength(source),maxSourceBytes:DEFAULT_LIMITS.maxSourceBytes,nodes:scene.nodes.length,maxNodes:DEFAULT_LIMITS.maxNodes,
    tracks:scene.timeline.tracks.length,maxTracks:DEFAULT_LIMITS.maxTracks,steps:scene.timeline.steps.length,maxSteps:DEFAULT_LIMITS.maxSteps,
    durationMs:35000,maxDurationMs:DEFAULT_LIMITS.maxDurationMs,compileMs,builderMsBeforePreview:performance.now()-started,runtimeAssertions:checks};
  if (measurements.sourceBytes > DEFAULT_LIMITS.maxSourceBytes) throw new Error("Source budget exceeded");
  console.log(JSON.stringify(measurements,null,2));
  if (process.env.GVR_PREVIEW_DIR) {
    await previews(scene,process.env.GVR_PREVIEW_DIR);
    writeFileSync(resolve(process.env.GVR_PREVIEW_DIR,"measurements.json"),JSON.stringify({...measurements,builderMsIncludingPreview:performance.now()-started},null,2)+"\n");
  }
}
main().catch(error => {console.error(error);process.exitCode=1;});
