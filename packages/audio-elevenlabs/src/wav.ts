/** Read duration from a 16-bit PCM WAV buffer (or raw pcm_24000 mono). */

export function durationMsFromWavOrPcm(
  bytes: Uint8Array,
  format: "wav_24000" | "pcm_24000",
): { durationMs: number; mimeType: string } {
  if (format === "pcm_24000") {
    const frames = Math.floor(bytes.byteLength / 2);
    return { durationMs: Math.max(1, Math.round((frames / 24_000) * 1000)), mimeType: "audio/pcm" };
  }
  if (bytes.byteLength < 44) {
    throw new Error("ElevenLabs WAV response is too short to decode.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sampleRate = view.getUint32(24, true);
  const channels = view.getUint16(22, true);
  const bits = view.getUint16(34, true);
  let dataBytes = view.getUint32(40, true);
  // Some writers put a larger RIFF size; prefer the data chunk length when sane.
  if (!(dataBytes > 0) || dataBytes + 44 > bytes.byteLength) {
    dataBytes = Math.max(0, bytes.byteLength - 44);
  }
  const bytesPerFrame = Math.max(1, channels * (bits / 8));
  const frames = Math.floor(dataBytes / bytesPerFrame);
  const rate = sampleRate > 0 ? sampleRate : 24_000;
  return { durationMs: Math.max(1, Math.round((frames / rate) * 1000)), mimeType: "audio/wav" };
}
