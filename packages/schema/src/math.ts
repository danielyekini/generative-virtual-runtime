import type { Camera2DDefinition, Mat3, Transform, Vec2, Viewport } from "./types";

/** Logical viewport used when a scene does not override it. */
export const LOGICAL_VIEWPORT: Viewport = {
  width: 1280,
  height: 720,
  fit: "contain",
};

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function translation(tx: number, ty: number): Mat3 {
  return [1, 0, 0, 0, 1, 0, tx, ty, 1];
}

export function scaling(sx: number, sy: number): Mat3 {
  return [sx, 0, 0, 0, sy, 0, 0, 0, 1];
}

/**
 * Positive θ is clockwise when y increases downward.
 * x' = x cos θ − y sin θ
 * y' = x sin θ + y cos θ
 */
export function rotation(radians: number): Mat3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [c, s, 0, -s, c, 0, 0, 0, 1];
}

/** Apply `b` first, then `a`. */
export function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  const out = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let col = 0; col < 3; col += 1) {
    for (let row = 0; row < 3; row += 1) {
      out[col * 3 + row] =
        (a[row] ?? 0) * (b[col * 3] ?? 0) +
        (a[3 + row] ?? 0) * (b[col * 3 + 1] ?? 0) +
        (a[6 + row] ?? 0) * (b[col * 3 + 2] ?? 0);
    }
  }
  return out as unknown as Mat3;
}

export function transformPoint(m: Mat3, x: number, y: number): Vec2 {
  return {
    x: m[0] * x + m[3] * y + m[6],
    y: m[1] * x + m[4] * y + m[7],
  };
}

/**
 * Mlocal = T(position) × T(pivot) × R(rotation) × S(scale) × T(−pivot)
 * The pivot is a local geometry point. It stays at `position + pivot`
 * in parent space for any rotation and scale.
 */
export function localMatrix(transform: Transform): Mat3 {
  const { position, pivot, rotation: radians, scale } = transform;
  return multiplyMat3(
    translation(position.x, position.y),
    multiplyMat3(
      translation(pivot.x, pivot.y),
      multiplyMat3(
        rotation(radians),
        multiplyMat3(scaling(scale.x, scale.y), translation(-pivot.x, -pivot.y)),
      ),
    ),
  );
}

/**
 * V = T(v) × S(z) × R(−θ) × T(−c)
 * v is the logical viewport centre. z scales the view directly.
 */
export function cameraViewMatrix(
  viewport: Pick<Viewport, "width" | "height">,
  camera: Pick<Camera2DDefinition, "position" | "zoom" | "rotation">,
): Mat3 {
  const vx = viewport.width / 2;
  const vy = viewport.height / 2;
  return multiplyMat3(
    translation(vx, vy),
    multiplyMat3(
      scaling(camera.zoom, camera.zoom),
      multiplyMat3(
        rotation(-camera.rotation),
        translation(-camera.position.x, -camera.position.y),
      ),
    ),
  );
}

export function mapWorldToLogical(
  viewport: Pick<Viewport, "width" | "height">,
  camera: Pick<Camera2DDefinition, "position" | "zoom" | "rotation">,
  world: Vec2,
): Vec2 {
  return transformPoint(cameraViewMatrix(viewport, camera), world.x, world.y);
}

export interface ContainFit {
  scale: number;
  offsetX: number;
  offsetY: number;
  /** Maps logical viewport pixels into CSS pixels. */
  matrix: Mat3;
}

/** Uniform contain fit. Unused CSS space is letterboxed, never stretched. */
export function containFit(
  viewport: Pick<Viewport, "width" | "height">,
  cssWidth: number,
  cssHeight: number,
): ContainFit {
  const scale = Math.min(cssWidth / viewport.width, cssHeight / viewport.height);
  const offsetX = (cssWidth - viewport.width * scale) / 2;
  const offsetY = (cssHeight - viewport.height * scale) / 2;
  return {
    scale,
    offsetX,
    offsetY,
    matrix: multiplyMat3(translation(offsetX, offsetY), scaling(scale, scale)),
  };
}

/** D × F. Canvas backing pixels from logical viewport pixels. */
export function deviceFitMatrix(
  viewport: Pick<Viewport, "width" | "height">,
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): Mat3 {
  return multiplyMat3(scaling(devicePixelRatio, devicePixelRatio), containFit(viewport, cssWidth, cssHeight).matrix);
}

/**
 * linear(u) = u
 * easeIn(u) = u²
 * easeOut(u) = 1 − (1 − u)²
 * easeInOut(u) = 2u² when u < 0.5, otherwise 1 − 2(1 − u)²
 */
export function applyEasing(
  name: "linear" | "easeIn" | "easeOut" | "easeInOut",
  u: number,
): number {
  const t = Math.min(1, Math.max(0, u));
  switch (name) {
    case "linear":
      return t;
    case "easeIn":
      return t * t;
    case "easeOut":
      return 1 - (1 - t) * (1 - t);
    case "easeInOut":
      return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  }
}

export function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

export function lerpVec2(a: Vec2, b: Vec2, u: number): Vec2 {
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
}

/** Toward-zero remainder, matching ECMAScript `%`. Zero divisor is rejected by the caller. */
export function towardZeroRemainder(a: number, b: number): number {
  return a - b * Math.trunc(a / b);
}
