// Choose one stable 15-second passage for every progressive clue.
// Energy detects audible passages, not lyrics or a chorus.
export function audiblePassage(pcm: Buffer, rate = 44100): Buffer | null {
  const samples = Math.floor(pcm.length / 2);
  const length = rate * 15;
  if (samples < length) return null;
  const step = Math.round(rate / 10);
  const energy: number[] = [];
  for (let start = 0; start + step <= samples; start += step) {
    let sum = 0;
    for (let i = start; i < start + step; i++) { const value = pcm.readInt16LE(i * 2) / 32768; sum += value * value; }
    energy.push(Math.sqrt(sum / step));
  }
  const peakEnergy = Math.max(...energy);
  if (peakEnergy < 0.001) return null;
  const threshold = Math.max(0.001, peakEnergy * 0.08);
  let best = -Infinity; let offset = -1;
  for (let start = 0; start + 150 <= energy.length; start++) {
    // The shortest clue must already contain sound; reject isolated clicks.
    if (energy[start]! < threshold || energy[start + 1]! < threshold) continue;
    const window = energy.slice(start, start + 150);
    const coverage = window.filter(value => value >= threshold).length / 150;
    if (coverage < 0.8) continue;
    const mean = window.reduce((sum, value) => sum + value, 0) / 150;
    const score = coverage * 2 + Math.min(energy[start]! / peakEnergy, 1) * 0.5 + mean / peakEnergy;
    if (score > best + 0.02) { best = score; offset = start * step; }
  }
  if (offset < 0) return null;
  const output = Buffer.from(pcm.subarray(offset * 2, (offset + length) * 2));
  let peak = 0; let squares = 0;
  for (let i = 0; i < output.length; i += 2) { const value = output.readInt16LE(i); peak = Math.max(peak, Math.abs(value)); squares += value * value; }
  const rms = Math.sqrt(squares / length);
  const gain = Math.min(4, 32767 * 0.9 / Math.max(peak, 1), 32768 * 0.12 / Math.max(rms, 1));
  for (let i = 0; i < output.length; i += 2) output.writeInt16LE(Math.round(output.readInt16LE(i) * gain), i);
  return output;
}
