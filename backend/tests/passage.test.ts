import { describe, expect, it } from 'vitest';
import { audiblePassage } from '../src/audio/passage.js';
function signal(seconds: number, volume: (second: number) => number) {
  const output = Buffer.alloc(seconds * 44100 * 2);
  for (let i = 0; i < seconds * 44100; i++) output.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / 44100) * volume(i / 44100)), i * 2);
  return output;
}
describe('trecho audível', () => {
  it('evita introdução baixa e pausas, mantendo 15 segundos e volume sem saturação', () => {
    const passage = audiblePassage(signal(30, second => second < 10 ? 30 : 6000))!;
    expect(passage.length).toBe(15 * 44100 * 2);
    let peak = 0;
    for (let i = 0; i < 8820; i += 2) peak = Math.max(peak, Math.abs(passage.readInt16LE(i)));
    expect(peak).toBeGreaterThan(1000); expect(peak).toBeLessThan(32767);
  });
  it('prefere entrada após pausa em vez de começar no meio do áudio já forte', () => {
    const passage = audiblePassage(signal(30, second => second >= 5 && second < 5.3 ? 0 : 6000))!;
    // Selecting position zero would leave that pause inside the returned window.
    let squares = 0;
    for (let i = 5 * 44100; i < 5.2 * 44100; i++) squares += passage.readInt16LE(i * 2) ** 2;
    expect(Math.sqrt(squares / (0.2 * 44100))).toBeGreaterThan(1000);
    expect(passage.readInt16LE(0)).toBe(0);
  });
  it('não desloca o início para um pico isolado no meio de uma frase contínua', () => {
    const passage = audiblePassage(signal(30, second => second > 4 && second < 4.1 ? 16000 : 6000))!;
    let firstPeak = 0;
    for (let i = 0; i < 4410; i++) firstPeak = Math.max(firstPeak, Math.abs(passage.readInt16LE(i * 2)));
    let middlePeak = 0;
    for (let i = 4 * 44100; i < 4.1 * 44100; i++) middlePeak = Math.max(middlePeak, Math.abs(passage.readInt16LE(i * 2)));
    expect(middlePeak).toBeGreaterThan(firstPeak * 2);
  });
  it('rejeita silêncio, clique isolado e fontes curtas', () => {
    expect(audiblePassage(Buffer.alloc(30 * 44100 * 2))).toBeNull();
    expect(audiblePassage(signal(30, second => second > 2 && second < 2.01 ? 30000 : 0))).toBeNull();
    expect(audiblePassage(signal(10, () => 6000))).toBeNull();
  });
});
