import type { FontStyle, TextAlign, TextBaseline, Vec2 } from "./types";

/**
 * Deterministic em-width fractions for the builtin `sans` family.
 * Unknown code points use {@link DEFAULT_ADVANCE_EM}. Host Canvas metrics may
 * replace this table at language-wiring time; headless tests stay host-free.
 */
export const BUILTIN_SANS_ADVANCES_EM: Readonly<Record<string, number>> = Object.freeze({
  " ": 0.33,
  ".": 0.28,
  ",": 0.28,
  "-": 0.36,
  "+": 0.55,
  "=": 0.55,
  "%": 0.78,
  "0": 0.56,
  "1": 0.56,
  "2": 0.56,
  "3": 0.56,
  "4": 0.56,
  "5": 0.56,
  "6": 0.56,
  "7": 0.56,
  "8": 0.56,
  "9": 0.56,
  A: 0.67,
  B: 0.67,
  C: 0.7,
  D: 0.7,
  E: 0.62,
  F: 0.58,
  G: 0.74,
  H: 0.72,
  I: 0.3,
  J: 0.5,
  K: 0.67,
  L: 0.56,
  M: 0.85,
  N: 0.72,
  O: 0.76,
  P: 0.62,
  Q: 0.76,
  R: 0.67,
  S: 0.62,
  T: 0.58,
  U: 0.72,
  V: 0.67,
  W: 0.95,
  X: 0.67,
  Y: 0.62,
  Z: 0.58,
  a: 0.55,
  b: 0.58,
  c: 0.52,
  d: 0.58,
  e: 0.55,
  f: 0.32,
  g: 0.58,
  h: 0.58,
  i: 0.26,
  j: 0.26,
  k: 0.52,
  l: 0.26,
  m: 0.85,
  n: 0.58,
  o: 0.58,
  p: 0.58,
  q: 0.58,
  r: 0.38,
  s: 0.5,
  t: 0.32,
  u: 0.58,
  v: 0.52,
  w: 0.75,
  x: 0.52,
  y: 0.52,
  z: 0.5,
});

/** Fallback advance for unlisted code points (matches legacy hit-test 0.6em). */
export const DEFAULT_ADVANCE_EM = 0.6;

export interface NumericFormatSpec {
  /** Digits after the decimal point. Omit for shortest round-trip of integers. */
  readonly fractionDigits?: number;
  /** Minimum integer digits (zero-padded). Default 1. */
  readonly minIntegerDigits?: number;
  /** When true, always include a leading "+" for non-negative values. */
  readonly sign?: "auto" | "always" | "never";
  /** Thousands grouping character; omit or empty for none. */
  readonly group?: string;
  /** Decimal separator. Default ".". */
  readonly decimal?: string;
  /**
   * Rounding mode applied before formatting. Half-away-from-zero matches
   * typical readout UX (0.5 → 1 at 0 fraction digits).
   */
  readonly round?: "halfAwayFromZero";
  /** Optional prefix/suffix (currency, units). Applied after the number body. */
  readonly prefix?: string;
  readonly suffix?: string;
}

export interface TextLineMetrics {
  readonly content: string;
  readonly width: number;
  readonly ascent: number;
  readonly descent: number;
  readonly fontSize: number;
  /** Local-space axis-aligned box relative to the text anchor (0,0). */
  readonly box: { readonly min: Vec2; readonly max: Vec2 };
}

function roundHalfAwayFromZero(value: number, fractionDigits: number): number {
  const factor = 10 ** fractionDigits;
  const scaled = value * factor;
  const sign = scaled < 0 ? -1 : 1;
  return (sign * Math.floor(Math.abs(scaled) + 0.5)) / factor;
}

function groupInteger(digits: string, separator: string): string {
  if (!separator) return digits;
  const parts: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) {
    parts.unshift(digits.slice(Math.max(0, i - 3), i));
  }
  return parts.join(separator);
}

/**
 * Format a finite number into a deterministic string for readouts.
 * Rejects NaN/±Infinity so authors catch bad bindings early.
 */
export function formatNumber(value: number, spec: NumericFormatSpec = {}): string {
  if (!Number.isFinite(value)) {
    throw new RangeError("formatNumber requires a finite number.");
  }
  const fractionDigits = spec.fractionDigits;
  const minIntegerDigits = spec.minIntegerDigits ?? 1;
  if (minIntegerDigits < 1 || !Number.isInteger(minIntegerDigits)) {
    throw new RangeError("minIntegerDigits must be an integer >= 1.");
  }
  if (fractionDigits !== undefined && (fractionDigits < 0 || !Number.isInteger(fractionDigits))) {
    throw new RangeError("fractionDigits must be an integer >= 0 when set.");
  }

  const rounded =
    fractionDigits === undefined
      ? value
      : roundHalfAwayFromZero(value, fractionDigits);

  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  let intPart: string;
  let fracPart = "";

  if (fractionDigits === undefined) {
    // Shortest integer when the value is integral; otherwise trim trailing zeros.
    if (Number.isInteger(abs)) {
      intPart = String(abs);
    } else {
      const raw = abs.toString();
      const parts = raw.split(".");
      intPart = parts[0] ?? "0";
      fracPart = (parts[1] ?? "").replace(/0+$/, "");
    }
  } else {
    const fixed = abs.toFixed(fractionDigits);
    const parts = fixed.split(".");
    intPart = parts[0] ?? "0";
    fracPart = fractionDigits > 0 ? (parts[1] ?? "") : "";
  }

  if (intPart.length < minIntegerDigits) {
    intPart = intPart.padStart(minIntegerDigits, "0");
  }
  intPart = groupInteger(intPart, spec.group ?? "");

  const decimal = spec.decimal ?? ".";
  let body = fracPart.length > 0 ? `${intPart}${decimal}${fracPart}` : intPart;

  const signMode = spec.sign ?? "auto";
  if (signMode === "never") {
    // magnitude only
  } else if (negative) {
    body = `-${body}`;
  } else if (signMode === "always") {
    body = `+${body}`;
  }

  return `${spec.prefix ?? ""}${body}${spec.suffix ?? ""}`;
}

/** Advance width in local units for one code point under a font style. */
export function advanceEm(codePoint: string, family = "sans"): number {
  if (family !== "sans") return DEFAULT_ADVANCE_EM;
  return BUILTIN_SANS_ADVANCES_EM[codePoint] ?? DEFAULT_ADVANCE_EM;
}

export function measureContentWidth(content: string, font: Pick<FontStyle, "family" | "size">): number {
  let width = 0;
  for (const ch of content) {
    width += advanceEm(ch, font.family) * font.size;
  }
  return width;
}

/**
 * Line metrics and local AABB for a single-line `text.basic` node.
 * Ascent/descent use the same em-box fractions as the hit-tester estimate.
 */
export function measureTextLine(
  content: string,
  font: FontStyle,
  align: TextAlign = "left",
  baseline: TextBaseline = "alphabetic",
): TextLineMetrics {
  if (!(font.size > 0)) {
    throw new RangeError("font.size must be > 0.");
  }
  const width = measureContentWidth(content, font);
  const ascent = font.size * 0.8;
  const descent = font.size * 0.2;
  const height = ascent + descent;
  const left = align === "left" ? 0 : align === "center" ? -width / 2 : -width;
  const top =
    baseline === "alphabetic"
      ? -ascent
      : baseline === "top"
        ? 0
        : baseline === "bottom"
          ? -height
          : -height / 2;
  return {
    content,
    width,
    ascent,
    descent,
    fontSize: font.size,
    box: {
      min: { x: left, y: top },
      max: { x: left + width, y: top + height },
    },
  };
}

/**
 * Resolve display content for a numeric readout binding.
 * When `format` is omitted the value is formatted as a shortest integer/decimal.
 */
export function resolveNumericContent(value: number, format?: NumericFormatSpec): string {
  return formatNumber(value, format ?? {});
}

/**
 * Footprint helper: how many static text variants a discrete numeric sequence
 * would need today versus one dynamic readout node.
 */
export function staticVariantCount(values: readonly number[]): number {
  const unique = new Set(values.map((v) => String(v)));
  return unique.size;
}
