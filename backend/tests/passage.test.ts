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
  it('rejeita silêncio, clique isolado e fontes curtas', () => {
    expect(audiblePassage(Buffer.alloc(30 * 44100 * 2))).toBeNull();
    expect(audiblePassage(signal(30, second => second > 2 && second < 2.01 ? 30000 : 0))).toBeNull();
    expect(audiblePassage(signal(10, () => 6000))).toBeNull();
  });
});
