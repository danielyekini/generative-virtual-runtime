/** Generated story plate. Run with npx tsx; optional GVR_PREVIEW_DIR writes real Chromium/CanvasRenderer PNGs. */
import { mkdirSync, writeFileSync, mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Cdp } from '../../../evaluation/harness/cdp';
import { buildSync } from 'esbuild';
import { compileMotionScript } from '@gvr/compiler';
import { AnimationRuntime } from '@gvr/runtime';
import { DEFAULT_LIMITS, transformPoint, validateSceneIR, type ResolvedDrawItem } from '@gvr/schema';
import { resolveChromeBinary } from '../../../evaluation/harness/chrome';
const started = performance.now();
const ID = 'two-ways-through-a-binary-tree';
const HERE = dirname(fileURLToPath(import.meta.url));
const INK = '#243448', BLUE = '#2678d8', VISITED = '#dbeeff', AMBER = '#ffe0a0';
type Key = [
    number,
    number,
    string?
];
const nodes: string[] = [], tracks: string[] = [];
function track(target: string, keys: Key[]) {
    const sorted = [...keys].sort((a, b) => a[0] - b[0]);
    if (sorted[0]![0] > 0)
        sorted.unshift([0, sorted[0]![1], 'hold']);
    if (sorted.at(-1)![0] < 30)
        sorted.push([30, sorted.at(-1)![1]]);
    tracks.push(`keyframes ${target} { start 0s; duration 30s; ${sorted.map(([t, v, e], i) => `${(t / 30 * 100).toFixed(6)}% ${v}${i < sorted.length - 1 ? ` ease ${e ?? 'hold'}` : ''};`).join(' ')} };`);
}
function windows(target: string, spans: [
    number,
    number
][], peak = 1) {
    const keys: Key[] = [[0, 0, 'hold']];
    for (const [a, b] of spans)
        keys.push([a, peak, 'hold'], [b, 0, 'hold']);
    track(target, keys);
}
function txt(id: string, x: number, y: number, content: string, size = 22, extra = '') {
    return `text ${id} { position (${x}, ${y}); content ${JSON.stringify(content)}; fontFamily "sans-serif"; fontSize ${size}; fontWeight 600; align center; baseline middle; fill ${INK}; ${extra} };`;
}
const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const points: [
    number,
    number
][] = [[0, 0], [-116, 100], [116, 100], [-174, 200], [-58, 200], [58, 200], [174, 200]];
const parents = [-1, 0, 0, 1, 1, 2, 2];
const bfsVisits = [8.25, 12.25, 14.75, 17.35, 18.65, 20.25, 23.35];
const dfsVisits = [8.25, 12.25, 19.6, 14.75, 17.35, 20.45, 23.35];
// Explicit events: returns retain stack ancestors but never append to visit order.
type State = {
    t: number;
    q: string;
    s: string;
    bc: string;
    dc: string;
};
const states: State[] = [
    { t: 6, q: 'A', s: 'A', bc: '', dc: '' },
    { t: 8.25, q: '', s: 'A', bc: 'A', dc: 'A' },
    { t: 9.15, q: 'B', s: 'A', bc: 'A', dc: 'A' },
    { t: 10, q: 'BC', s: 'AB', bc: 'A', dc: 'A' },
    { t: 12.25, q: 'C', s: 'AB', bc: 'B', dc: 'B' },
    { t: 13, q: 'CD', s: 'AB', bc: 'B', dc: 'B' },
    { t: 13.75, q: 'CDE', s: 'ABD', bc: 'B', dc: 'B' },
    { t: 14.75, q: 'DE', s: 'ABD', bc: 'C', dc: 'D' },
    { t: 15.35, q: 'DEF', s: 'ABD', bc: 'C', dc: 'D' },
    { t: 16.1, q: 'DEFG', s: 'AB', bc: 'C', dc: 'B' },
    { t: 17.15, q: 'DEFG', s: 'ABE', bc: 'C', dc: 'B' },
    { t: 17.35, q: 'EFG', s: 'ABE', bc: 'D', dc: 'E' },
    { t: 18.1, q: 'EFG', s: 'AB', bc: 'D', dc: 'B' },
    { t: 18.65, q: 'FG', s: 'A', bc: 'E', dc: 'A' },
    { t: 19.15, q: 'FG', s: 'AC', bc: 'E', dc: 'A' },
    { t: 19.6, q: 'FG', s: 'AC', bc: 'E', dc: 'C' },
    { t: 20.25, q: 'G', s: 'ACF', bc: 'F', dc: 'C' },
    { t: 20.45, q: 'G', s: 'ACF', bc: 'F', dc: 'F' },
    { t: 21.7, q: 'G', s: 'AC', bc: 'F', dc: 'C' },
    { t: 23.15, q: 'G', s: 'ACG', bc: 'F', dc: 'C' },
    { t: 23.35, q: '', s: 'ACG', bc: 'G', dc: 'G' },
    { t: 24.25, q: '', s: 'AC', bc: '', dc: 'C' },
    { t: 25, q: '', s: 'A', bc: '', dc: 'A' },
    { t: 25.75, q: '', s: '', bc: '', dc: '' },
];
function stateWindows(predicate: (s: State) => boolean): [
    number,
    number
][] {
    const result: [
        number,
        number
    ][] = [];
    states.forEach((s, i) => { if (predicate(s)) {
        const end = states[i + 1]?.t ?? 30;
        const prior = result.at(-1);
        if (prior && prior[1] === s.t)
            prior[1] = end;
        else
            result.push([s.t, end]);
    } });
    return result;
}
function tree(id: string, cx: number, visits: number[], kind: 'b' | 'd' | 'intro') {
    const parts: string[] = [];
    for (let i = 1; i < 7; i++) {
        const [x, y] = points[i]!, [px, py] = points[parents[i]!]!;
        parts.push(`path e${i} { move (${px}, ${py + 24}); line (${x}, ${y - 24}); stroke ${INK} width 2; };`);
        if (kind === 'intro') {
            nodes.push(`operators ${id}.e${i} { trim 0, 0, 0; };`);
            track(`${id}.e${i}.trim.end`, [[0, 0], [i < 3 ? 1 : 3, 0, 'easeOut'], [i < 3 ? 2 : 4, 1]]);
        }
        else {
            parts.push(`path h${i} { move (${px}, ${py + 24}); line (${x}, ${y - 24}); stroke ${BLUE} width 5; opacity 0; };`);
            const active = stateWindows(s => (kind === 'b' ? s.bc : s.dc) === letters[i]);
            if (kind === 'd' && i === 1)
                active.push([27.8, 28.2], [28.6, 29]);
            if (kind === 'd' && i === 3)
                active.push([28.2, 28.6]);
            windows(`${id}.h${i}.opacity`, active);
        }
    }
    letters.forEach((letter, i) => {
        const [x, y] = points[i]!;
        parts.push(`group n${letter} { position (${x}, ${y}); circle disc { radius 25; fill #ffffff; stroke ${INK} width 2; }; circle pending { radius 24; fill ${AMBER}; opacity 0; }; circle visited { radius 24; fill ${VISITED}; opacity 0; }; circle current { radius 24; fill ${BLUE}; opacity 0; }; ${txt('label', 0, 1, letter, 24)} };`);
        if (kind === 'intro') {
            const a = i === 0 ? 0 : i < 3 ? 2 : 4;
            track(`${id}.n${letter}.opacity`, [[0, 0], [a + .01, 0, 'easeOut'], [a + .85, 1]]);
            for (const axis of ['x', 'y'])
                track(`${id}.n${letter}.scale.${axis}`, [[0, .05], [a + .01, .05, 'easeOut'], [a + .85, 1]]);
        }
        else {
            windows(`${id}.n${letter}.pending.opacity`, stateWindows(s => (kind === 'b' ? s.q : s.s).includes(letter)));
            track(`${id}.n${letter}.visited.opacity`, [[0, 0], [visits[i]!, 1]]);
            windows(`${id}.n${letter}.current.opacity`, stateWindows(s => (kind === 'b' ? s.bc : s.dc) === letter));
        }
    });
    nodes.push(`group ${id} { position (${cx}, 160); ${kind === 'intro' ? '' : 'opacity 0;'} ${parts.join('\n')} };`);
    if (kind === 'b')
        track(`${id}.opacity`, [[0, 0], [6, 1]]);
    if (kind === 'd')
        track(`${id}.opacity`, [[0, 0], [5.65, 0, 'easeOut'], [6, 1]]);
}
tree('grown', 640, [], 'intro');
track('grown.opacity', [[0, 1], [6, 0]]);
track('grown.position.x', [[0, 640], [5, 640, 'easeInOut'], [6, 325]]);
for (const axis of ['x', 'y'])
    track(`grown.scale.${axis}`, [[0, 1.4], [5, 1.4, 'easeInOut'], [6, 1]]);
tree('bTree', 325, bfsVisits, 'b');
tree('dTree', 955, dfsVisits, 'd');
nodes.push(txt('title', 640, 35, 'Two Ways Through a Binary Tree', 30));
const ui: string[] = [txt('bTitle', 325, 95, 'Breadth-first: level by level', 24), txt('dTitle', 955, 95, 'Depth-first: preorder', 24), txt('queueLabel', 325, 417, 'QUEUE   ·   FRONT ←', 18), txt('stackLabel', 1190, 417, 'CALL STACK', 17), txt('stackTop', 1190, 444, 'TOP ↓', 16), txt('bVisit', 325, 555, 'Visit order', 17), txt('dVisit', 955, 555, 'Visit order', 17)];
// A slim stack sits beside, rather than over, the right tree; bottom-to-top is literal.
states.forEach((s, i) => {
    const end = states[i + 1]?.t ?? 30;
    const q = [...s.q].map((v, j) => `rectangle box${j} { position (${215 + j * 58}, 448); size (48, 40); fill ${AMBER}; stroke ${INK} width 1; }; ${txt(`val${j}`, 239 + j * 58, 469, v)}`).join('\n');
    const stack = [...s.s].map((v, j) => `rectangle frame${j} { position (1166, ${518 - j * 23}); size (48, 22); fill ${AMBER}; stroke ${INK} width 1; }; ${txt(`entry${j}`, 1190, 529 - j * 23, v, 17)}`).join('\n');
    ui.push(`group state${i} { opacity 0; ${q} ${stack} };`);
    windows(`ui.state${i}.opacity`, [[s.t, end]]);
});
for (const [side, order, visits, cx] of [['b', 'ABCDEFG', bfsVisits, 325], ['d', 'ABDECFG', dfsVisits, 955]] as const) {
    [...order].forEach((v, j) => {
        ui.push(txt(`${side}Order${j}`, cx - 210 + j * 70, 598, v, 25));
        track(`ui.${side}Order${j}.opacity`, [[0, 0], [visits[letters.indexOf(v)]!, 1]]);
        if (j < 6) {
            ui.push(txt(`${side}Arrow${j}`, cx - 175 + j * 70, 598, '→', 20));
            track(`ui.${side}Arrow${j}.opacity`, [[0, 0], [visits[letters.indexOf(order[j + 1]!)]!, 1]]);
        }
    });
}
ui.push(txt('leaf', 780, 386, 'Leaf', 17));
windows('ui.leaf.opacity', [[15, 16.05]]);
ui.push(txt('queueDone', 325, 477, 'Queue empty — complete.', 19));
track('ui.queueDone.opacity', [[0, 0], [23.35, 1]]);
ui.push(txt('stackDone', 955, 477, 'Stack empty — complete.', 19));
track('ui.stackDone.opacity', [[0, 0], [25.75, 1]]);
ui.push(txt('bCaption', 325, 675, 'Visit each level first', 22), txt('dCaption', 955, 675, 'Explore a branch before returning.', 22));
for (const id of ['bCaption', 'dCaption'])
    track(`ui.${id}.opacity`, [[0, 0], [27, 0, 'easeOut'], [27.25, 1]]);
track('ui.stackTop.position.y', states.map(s => [s.t, s.s.length ? 529 - (s.s.length - 1) * 23 - 28 : 444] as Key));
for (const label of ['queueLabel', 'stackLabel', 'stackTop'])
    track(`ui.${label}.opacity`, [[0, 1], [27, 1, 'easeOut'], [27.5, .45]]);
nodes.push(`group ui { opacity 0; ${ui.join('\n')} };`);
track('ui.opacity', [[0, 0], [5.8, 0, 'easeOut'], [6, 1]]);
for (let i = 0; i < 3; i++) {
    nodes.push(`rectangle band${i} { position (120, ${130 + i * 100}); size (410, 60); fill ${BLUE}; opacity 0; zIndex -1; };`);
    windows(`band${i}.opacity`, [[27 + i * .65, 27.6 + i * .65]], .13);
}
nodes.push(`line divider { from (640, 80); to (640, 630); stroke #d6dee8 width 1; opacity 0; };`);
track('divider.opacity', [[0, 0], [5, 0, 'easeOut'], [6, 1]]);
const source = `// Generated by build-${ID}.ts; do not edit. Audio omitted: not in current contract.\nscene "${ID}" { version "0.2"; viewport (1280, 720); background #ffffff; duration 30s; requires "text.basic"; requires "easing.hold"; requires "geometry.trimPath"; requires "geometry.animatedTrim"; };\n${nodes.filter(n => !n.startsWith('operators')).join('\n')}\n${nodes.filter(n => n.startsWith('operators')).join('\n')}\n${tracks.join('\n')}\ncomplete;\n`;
writeFileSync(resolve(HERE, `${ID}.ms`), source);
const compileStart = performance.now();
const compiled = compileMotionScript(source);
const compileMs = performance.now() - compileStart;
if (compiled.diagnostics.length || !compiled.ok || !compiled.scene)
    throw Error(JSON.stringify(compiled.diagnostics));
const scene = compiled.scene;
const validated = validateSceneIR(scene);
if (!validated.ok)
    throw Error(JSON.stringify(validated.diagnostics));
const runtime = new AnimationRuntime(scene);
function evaluate(t: number) { const frame = runtime.evaluate(t * 1000); if (runtime.lastDiagnostics.length)
    throw Error(JSON.stringify(runtime.lastDiagnostics)); return frame; }
const frames = new Map<number, Map<string, ResolvedDrawItem>>();
function item(t: number, id: string): ResolvedDrawItem { if (!frames.has(t))
    frames.set(t, new Map(evaluate(t).drawItems.map(d => [d.nodeId, d]))); const found = frames.get(t)!.get(id); if (!found)
    throw Error(`Missing ${id} at ${t}`); return found; }
function assert(ok: boolean, message: string) { if (!ok)
    throw Error(message); }
function visible(t: number, id: string, x?: number, y?: number) { const d = item(t, id); assert(d.opacity > .9, `${id} hidden at ${t}`); const p = transformPoint(d.logicalMatrix, 0, 0); assert(p.x >= 26 && p.x <= 1254 && p.y >= 26 && p.y <= 640, `${id} outside safe area at ${t}`); if (x !== undefined)
    assert(Math.abs(p.x - x) < 1 && Math.abs(p.y - y!) < 1, `${id} misplaced at ${t}`); }
visible(.95, 'grown.nA.label');
assert(item(.95, 'grown.nB.label').opacity < .01, 'B grew too early');
visible(2.95, 'grown.nB.label');
visible(2.95, 'grown.nC.label');
for (const t of [4.95, 5])
    for (const v of letters)
        visible(t, `grown.n${v}.label`);
for (const s of states) {
    const t = s.t + .03;
    for (const [prefix, cx] of [['bTree', 325], ['dTree', 955]] as const)
        letters.forEach((v, i) => visible(t, `${prefix}.n${v}.label`, cx + points[i]![0], 161 + points[i]![1]));
    const index = states.indexOf(s);
    [...s.q].forEach((v, j) => { visible(t, `ui.state${index}.val${j}`, 239 + j * 58, 469); assert(item(t, `ui.state${index}.val${j}`).geometry.kind === 'text', 'queue text'); });
    [...s.s].forEach((v, j) => visible(t, `ui.state${index}.entry${j}`, 1190, 529 - j * 23));
    for (const [side, current] of [['bTree', s.bc], ['dTree', s.dc]])
        for (const v of letters)
            assert((item(t, `${side}.n${v}.current`).opacity > .9) === (current === v), `${side} current ${v} at ${t}`);
}
for (const [side, order, times] of [['b', 'ABCDEFG', bfsVisits], ['d', 'ABDECFG', dfsVisits]] as const)
    for (let j = 0; j < 7; j++) {
        const id = `ui.${side}Order${j}`, t = times[letters.indexOf(order[j]!)]!;
        assert(item(t - .02, id).opacity < .01, `${id} early`);
        visible(t + .03, id);
        const g = item(29.9, id).geometry;
        assert(g.kind === 'text' && g.content === order[j], `Wrong ${side} order`);
    }
visible(16.2, 'dTree.nB.current');
visible(26, 'ui.stackDone');
visible(24, 'ui.queueDone');
for (const t of [27.3, 28.4, 29.9, 30])
    for (const side of ['bTree', 'dTree'])
        for (const v of letters)
            visible(t, `${side}.n${v}.visited`);
// Independent script checkpoints read visible rendered text, not the event table.
const checkpoints: [
    number,
    string,
    string,
    string,
    string
][] = [
    [7.5, 'A', 'A', '', ''], [11.5, 'BC', 'AB', 'A', 'A'], [14.2, 'CDE', 'ABD', 'AB', 'AB'],
    [16.7, 'DEFG', 'AB', 'ABC', 'ABD'], [19.85, 'FG', 'AC', 'ABCDE', 'ABDEC'],
    [22.5, 'G', 'AC', 'ABCDEF', 'ABDECF'], [24.5, '', 'AC', 'ABCDEFG', 'ABDECFG'],
    [26.5, '', '', 'ABCDEFG', 'ABDECFG'], [29.9, '', '', 'ABCDEFG', 'ABDECFG'],
];
function renderedText(t: number, pattern: RegExp, vertical = false) {
    const drawn = evaluate(t).drawItems.filter(d => d.opacity > .9 && d.geometry.kind === 'text' && pattern.test(d.nodeId));
    drawn.sort((a, b) => { const pa = transformPoint(a.logicalMatrix, 0, 0), pb = transformPoint(b.logicalMatrix, 0, 0); return vertical ? pb.y - pa.y : pa.x - pb.x; });
    return drawn.map(d => d.geometry.kind === 'text' ? d.geometry.content : '').join('');
}
for (const [t, q, stack, b, d] of checkpoints) {
    assert(renderedText(t, /ui\.state\d+\.val\d+/) === q, `Queue contents at ${t}`);
    assert(renderedText(t, /ui\.state\d+\.entry\d+/, true) === stack, `Stack contents at ${t}`);
    assert(renderedText(t, /ui\.bOrder\d+/) === b, `BFS visit strip at ${t}`);
    assert(renderedText(t, /ui\.dOrder\d+/) === d, `DFS visit strip at ${t}`);
}
// Sweep visible tree discs and text anchors, including transition midpoints, in both seek directions.
for (const t of [...Array.from({ length: 121 }, (_, i) => i / 4), 16.7, 10.5, 29.9]) {
    for (const d of evaluate(t).drawItems) {
        if (d.opacity < .05)
            continue;
        const p = transformPoint(d.logicalMatrix, 0, 0);
        if (d.geometry.kind === 'circle') {
            const radius = d.geometry.radius * Math.hypot(d.logicalMatrix[0], d.logicalMatrix[1]) + 2;
            assert(p.x - radius >= 0 && p.x + radius <= 1280 && p.y - radius >= 0 && p.y + radius < 650, `Disc bounds ${d.nodeId} at ${t}`);
        }
        if (d.geometry.kind === 'text')
            assert(p.x >= 20 && p.x <= 1260 && p.y >= 20 && p.y < 700, `Text anchor ${d.nodeId} at ${t}`);
    }
}
const metrics = { sourceBytes: Buffer.byteLength(source), maxSourceBytes: DEFAULT_LIMITS.maxSourceBytes, nodes: scene.nodes.length, maxNodes: DEFAULT_LIMITS.maxNodes, tracks: scene.timeline.tracks.length, maxTracks: DEFAULT_LIMITS.maxTracks, steps: scene.timeline.steps.length, maxSteps: DEFAULT_LIMITS.maxSteps, compileMs, builderMs: performance.now() - started };
assert(metrics.sourceBytes <= metrics.maxSourceBytes, 'Source over budget');
console.log(JSON.stringify(metrics, null, 2));
const previewDir = process.env.GVR_PREVIEW_DIR;
if (previewDir) {
    mkdirSync(previewDir, { recursive: true });
    writeFileSync(resolve(previewDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
    const scratch = mkdtempSync(resolve('work/tree-preview-'));
    try {
        const bundle = buildSync({ stdin: { contents: `import {CanvasRenderer} from '@gvr/canvas-renderer'; import {AnimationRuntime} from '@gvr/runtime'; const scene=${JSON.stringify(scene)}; const r=new CanvasRenderer(document.querySelector('canvas'));r.resize(1280,720,1);const runtime=new AnimationRuntime(scene);window.renderStory=(t)=>{r.render(runtime.evaluate(t*1000));return document.querySelector('canvas').toDataURL('image/png');};`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife' }).outputFiles[0]!.text;
        const html = resolve(scratch, 'index.html');
        writeFileSync(html, `<html><body style="margin:0;overflow:hidden"><canvas></canvas><script>window.onerror=(m)=>{document.body.dataset.error=m;};</script><script>${bundle}</script></body></html>`);
        const times = [0, .5, 1, 2, 3, 4, 5, 5.5, 6, 7.9, 8, 8.5, 10.5, 12, 13.9, 14.5, 15.5, 16.5, 17, 17.6, 18.8, 19.8, 20, 20.8, 22, 23, 23.6, 24.5, 25.2, 26, 27, 27.3, 28, 28.5, 29, 29.9, 30];
        const server = createServer((_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(html)); });
        await new Promise<void>(res => server.listen(0, '127.0.0.1', () => res()));
        const address = server.address();
        assert(address !== null && typeof address === 'object', 'Preview server address');
        const browser = spawn(resolveChromeBinary(), ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${resolve(scratch, 'profile')}`, 'about:blank'], { stdio: 'ignore' });
        try {
            const portFile = resolve(scratch, 'profile/DevToolsActivePort');
            for (let i = 0; !existsSync(portFile) && i < 100; i++)
                await delay(100);
            const [port, endpoint] = readFileSync(portFile, 'utf8').trim().split('\n');
            const socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
            await new Promise<void>((res, rej) => { socket.addEventListener('open', () => res(), { once: true }); socket.addEventListener('error', () => rej(Error('DevTools connection')), { once: true }); });
            const cdp = new Cdp(socket);
            const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
            const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
            await cdp.send('Page.navigate', { url: `http://127.0.0.1:${(address as {
                    port: number;
                }).port}/` }, sessionId);
            let ready = false;
            for (let i = 0; i < 100; i++) {
                const r = await cdp.send('Runtime.evaluate', { expression: 'typeof window.renderStory', returnByValue: true }, sessionId);
                if (r.result.value === 'function') {
                    ready = true;
                    break;
                }
                await delay(100);
            }
            if (!ready)
                console.log(await cdp.send('Runtime.evaluate', { expression: 'JSON.stringify({url:location.href,error:document.body?.dataset.error,body:document.body?.innerText})', returnByValue: true }, sessionId));
            assert(ready, 'Canvas preview failed to load');
            for (const t of times) {
                const r = await cdp.send('Runtime.evaluate', { expression: `window.renderStory(${t})`, returnByValue: true }, sessionId);
                assert(!r.exceptionDetails, `Preview failure at ${t}`);
                writeFileSync(resolve(previewDir, `f${t.toFixed(2)}.png`), Buffer.from(r.result.value.split(',')[1], 'base64'));
            }
            socket.close();
        }
        finally {
            server.close();
            browser.kill('SIGTERM');
            await new Promise<void>(res => browser.once('exit', () => res()));
        }
        writeFileSync(resolve(previewDir, 'frames.json'), JSON.stringify(times));
        console.log(`CanvasRenderer Chromium stills: ${previewDir}`);
        console.log(`Total builder time including previews: ${(performance.now()-started).toFixed(1)}ms`);
    }
    finally {
        rmSync(scratch, { recursive: true, force: true });
    }
}
