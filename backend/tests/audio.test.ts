import { spawnSync } from 'node:child_process';
import ffmpegStatic from 'ffmpeg-static';
import { describe, expect, it } from 'vitest';
import { ApplePreviewProvider } from '../src/audio/provider.js';
const binary = ffmpegStatic as unknown as string;
describe('áudio com FFmpeg real', () => {
  it('corta a duração no servidor e remove título do arquivo', async () => {
    const source = spawnSync(binary, ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', '-metadata', 'title=SEGREDO_RESPOSTA', '-f', 'mp3', 'pipe:1'], { windowsHide: true });
    expect(source.status).toBe(0);
    const provider = new ApplePreviewProvider(binary, async () => new Response(new Uint8Array(source.stdout)));
    const clip = await provider.clip('https://audio-ssl.itunes.apple.com/test.mp3', 1);
    expect(clip.includes(Buffer.from('SEGREDO_RESPOSTA'))).toBe(false);
    const decoded = spawnSync(binary, ['-i', 'pipe:0', '-f', 's16le', '-ar', '44100', '-ac', '2', 'pipe:1'], { input: clip, windowsHide: true });
    expect(decoded.status).toBe(0);
    const seconds = decoded.stdout.length / (44100 * 2 * 2);
    expect(seconds).toBeGreaterThanOrEqual(1); expect(seconds).toBeLessThan(1.1);
  });
  it('falha sem expor URL ou corpo do provedor', async () => {
    const provider = new ApplePreviewProvider(binary, async () => new Response('secret metadata', { status: 404 }));
    await expect(provider.clip('https://audio-ssl.itunes.apple.com/private.mp3', 1)).rejects.toThrow('Não foi possível');
  });
  it('rejeita duração arbitrária e URL externa', async () => {
    const provider = new ApplePreviewProvider(binary);
    await expect(provider.clip('https://evil.test/secret', 5)).rejects.toThrow('inválida');
    await expect(provider.clip('https://audio-ssl.itunes.apple.com/private.mp3', 30)).rejects.toThrow('inválida');
  });
});
