import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createRequire } from 'node:module';
import { importSource } from '@gvr/format-import-core';
import { lottieAdapter } from '@gvr/format-lottie';
import { emitMotionScript } from '@gvr/motionscript-emitter';
import { compileMotionScript } from '@gvr/compiler';
import { Cdp } from '../evaluation/harness/cdp';
import { checkVisualFrame } from '../evaluation/harness/visual-gate';

const { PNG } = createRequire(import.meta.url)('../evaluation/node_modules/pngjs');
const run = readFileSync('work/current-run', 'utf8');
const label = process.argv[2] ?? 'baseline';
const dir = resolve('docs/evaluations', run, 'evidence', 'parent-order-probe', label);
mkdirSync(dir, { recursive: true });
const ks = (x = 0, opacity = 100) => ({ o: { a: 0, k: opacity }, r: { a: 0, k: 0 }, p: { a: 0, k: [x, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } });
const box = (ind: number, color: number[], parent?: number) => ({ ty: 4, ind, ip: 0, op: 60, st: 0, sr: 1, ks: ks(), ...(parent ? { parent } : {}), shapes: [{ ty: 'rc', nm: 'Box', d: 1, p: { a: 0, k: [64, 64] }, s: { a: 0, k: [60, 60] }, r: { a: 0, k: 0 } }, { ty: 'fl', c: { a: 0, k: color }, o: { a: 0, k: 100 } }] });
const children = [box(1, [1, 0, 0, 1], 3), box(2, [0, 0, 1, 1]), box(3, [0, 1, 0, 1])];
const cases = {
  interleaved: { v: '5.7.4', fr: 30, ip: 0, op: 60, w: 128, h: 128, layers: children },
  precomp: { v: '5.7.4', fr: 30, ip: 0, op: 60, w: 128, h: 128, layers: [{ ty: 0, ind: 10, refId: 'comp', ip: 0, op: 60, st: 0, sr: 1, w: 128, h: 128, ks: ks(0, 50) }], assets: [{ id: 'comp', layers: [children[0], children[1], { ...children[2], ks: ks(0, 25), hd: true }] }] },
};
const settings = JSON.parse(readFileSync('evaluation/gate-settings.json', 'utf8'));
const chrome = spawn('/usr/bin/chromium', ['--headless=new', '--disable-gpu', '--force-device-scale-factor=1', '--remote-debugging-port=9444', '--user-data-dir=' + mkdtempSync(join(tmpdir(), 'gvr-parent-')), '--no-first-run', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeLog = ''; chrome.stderr.on('data', chunk => chromeLog += chunk.toString());
let socket: WebSocket | undefined;
try {
  let ws = '';
  for (let i = 0; i < 100; i++) { try { ws = (await (await fetch('http://127.0.0.1:9444/json/version')).json()).webSocketDebuggerUrl; if (ws) break; } catch {} await delay(100); }
  socket = new WebSocket(ws); await new Promise<void>((r, j) => { socket!.addEventListener('open', () => r()); socket!.addEventListener('error', () => j(new Error('socket'))); });
  const cdp = new Cdp(socket);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'http://127.0.0.1:5199/' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = async (code: string) => { const r = await cdp.send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true }, sessionId); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  for (let i = 0; i < 100; i++) { if (await evaluate('Boolean(window.__ready)')) break; await delay(100); }
  const output = [];
  for (const [name, source] of Object.entries(cases)) {
    const text = JSON.stringify(source); writeFileSync(join(dir, name + '-source.json'), text);
    const imported = importSource(lottieAdapter, text, { sourceName: name + '.json' });
    if (!imported.ok || !imported.scene) throw new Error('import failed');
    const program = emitMotionScript(imported.scene); writeFileSync(join(dir, name + '.motion'), program);
    const compiled = compileMotionScript(program); if (!compiled.ok || !compiled.scene) throw new Error('compile failed');
    for (const [route, scene] of Object.entries({ imported: imported.scene, compiled: compiled.scene })) {
      writeFileSync(join(dir, name + '-' + route + '-scene.json'), JSON.stringify(scene));
      const result = await evaluate(`(async()=>{
        await import('/@fs${resolve('node_modules/lottie-web/build/player/lottie.js')}');const lottie=window.lottie;
        const {CanvasRenderer}=await import('/@fs${resolve('packages/canvas-renderer/src/index.ts')}');
        const {AnimationRuntime}=await import('/@fs${resolve('packages/runtime/src/index.ts')}');
        const host=document.createElement('div');host.style.width='128px';host.style.height='128px';document.body.append(host);
        const player=lottie.loadAnimation({container:host,renderer:'canvas',loop:false,autoplay:false,animationData:${text},rendererSettings:{clearCanvas:true,dpr:1,preserveAspectRatio:'xMidYMid meet'}});player.setSubframe(true);
        await new Promise((resolve,reject)=>{player.addEventListener('DOMLoaded',resolve);player.addEventListener('data_failed',()=>reject(new Error('reference data_failed')));setTimeout(()=>reject(new Error('reference timeout')),8000);});
        await document.fonts.ready;player.goToAndStop(0,true);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const ref=document.createElement('canvas');ref.width=ref.height=128;const ctx=ref.getContext('2d');ctx.fillStyle='#101014';ctx.fillRect(0,0,128,128);ctx.drawImage(host.querySelector('canvas'),0,0);
        const native=document.createElement('canvas');const renderer=new CanvasRenderer(native);renderer.resize(128,128,1);const frame=new AnimationRuntime(${JSON.stringify(scene)}).evaluate(0);renderer.render(frame);
        const result={reference:ref.toDataURL(),native:native.toDataURL(),items:frame.drawItems};player.destroy();host.remove();renderer.dispose();return result;
      })()`);
      const png = (value: string) => PNG.sync.read(Buffer.from(value.split(',')[1]!, 'base64'));
      const ref = png(result.reference), native = png(result.native);
      writeFileSync(join(dir, name + '-' + route + '-reference.png'), PNG.sync.write(ref));
      writeFileSync(join(dir, name + '-' + route + '-native.png'), PNG.sync.write(native));
      output.push({ name, route, gate: checkVisualFrame(ref, native, settings.visualCertification, settings.pixel.inspectionThreshold), items: result.items });
    }
  }
  writeFileSync(join(dir, 'results.json'), JSON.stringify({ scope: 'Separate minimal reproductions; does not expand accepted corpus', output }, null, 2));
  console.log(output.map(x => ({ name: x.name, route: x.route, hot: x.gate.fractionBeyond, local: x.gate.maxLocalFractionBeyond, passed: x.gate.passed })));
} finally { writeFileSync(join(dir, 'chrome-log.txt'), chromeLog); socket?.close(); chrome.kill('SIGTERM'); }
