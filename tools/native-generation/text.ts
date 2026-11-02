/** Normalize model output into raw MotionScript source. */
export function stripModelFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:motionscript|ms)?\s*\n([\s\S]*?)\n```/i);
  if (fenced?.[1]) return fenced[1].trim();
  if (/^```(?:motionscript|ms)?\s*\n/i.test(trimmed)) {
    return trimmed.replace(/^```(?:motionscript|ms)?\s*\n/i, "").replace(/\n```$/i, "").trim();
  }
  return trimmed;
}
