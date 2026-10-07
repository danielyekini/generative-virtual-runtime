import type { ResolvedDrawItem, ResolvedFrame, SceneIR } from "@gvr/schema";

export function clearCanvas(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

export function describeFrame(frame: ResolvedFrame): string {
  const lines = [
    `time ${frame.sceneTimeMs.toFixed(1)} ms`,
    `revision ${frame.revision}`,
    `viewport ${frame.viewport.width}×${frame.viewport.height} ${frame.viewport.fit}`,
    `items ${frame.drawItems.length}`,
    "",
    ...frame.drawItems.map((item) => describeItem(item)),
  ];
  return lines.join("\n");
}

function describeItem(item: ResolvedDrawItem): string {
  const x = item.logicalMatrix[6] ?? 0;
  const y = item.logicalMatrix[7] ?? 0;
  return `${item.nodeId}\t${item.geometry.kind}\topacity ${item.opacity.toFixed(2)}\torigin ${x.toFixed(1)}, ${y.toFixed(1)}`;
}

export function describeScene(scene: SceneIR | undefined, label: string): string {
  if (!scene) return "";
  return `${label}\n${JSON.stringify(scene, null, 2)}`;
}

export function sameItems(left: readonly ResolvedDrawItem[], right: readonly ResolvedDrawItem[]): string {
  if (left.length !== right.length) return `draw count ${left.length} != ${right.length}`;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (!a || !b) return "missing draw item";
    if (a.nodeId !== b.nodeId) return a.nodeId;
    for (let cell = 0; cell < a.logicalMatrix.length; cell += 1) {
      if (Math.abs((a.logicalMatrix[cell] ?? 0) - (b.logicalMatrix[cell] ?? 0)) > 1e-3) return `${a.nodeId} drifted`;
    }
  }
  return "";
}
