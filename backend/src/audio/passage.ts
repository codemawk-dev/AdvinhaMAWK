// Choose one stable 15-second passage for every progressive clue.
// Prefer sustained entrances after a short breath, not the loudest mid-phrase sample.
// Energy cannot identify lyrics or guarantee a chorus.
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
    const entrance = energy.slice(start, start + 3).reduce((sum, value) => sum + value, 0) / 3;
    const before = energy.slice(Math.max(0, start - 3), start);
    const previous = before.length ? before.reduce((sum, value) => sum + value, 0) / before.length : entrance;
    const breath = start >= 3 && previous < entrance * 0.55 && energy[start + 2]! >= threshold;
    // Without a plausible entrance, preserve the first audible position instead of
    // moving into a syllable simply because it happens to be louder.
    const firstSound = start > 0 && energy[start - 1]! < threshold;
    if (start > 0 && !breath && !firstSound) continue;
    const score = coverage * 2 + mean / peakEnergy * 0.25 + (breath ? 1.5 : 0);
    if (score > best + 0.02) { best = score; offset = start * step; }
  }
  if (offset < 0) return null;
  const output = Buffer.from(pcm.subarray(offset * 2, (offset + length) * 2));
  let peak = 0; let squares = 0;
  for (let i = 0; i < output.length; i += 2) { const value = output.readInt16LE(i); peak = Math.max(peak, Math.abs(value)); squares += value * value; }
  const rms = Math.sqrt(squares / length);
  const gain = Math.min(4, 32767 * 0.9 / Math.max(peak, 1), 32768 * 0.12 / Math.max(rms, 1));
  for (let i = 0; i < output.length; i += 2) output.writeInt16LE(Math.round(output.readInt16LE(i) * gain), i);
  // A 2 ms ramp prevents a discontinuity click without hiding the 100 ms clue.
  const ramp = Math.round(rate * 0.002);
  for (let i = 0; i < ramp; i++) output.writeInt16LE(Math.round(output.readInt16LE(i * 2) * i / ramp), i * 2);
  return output;
}
