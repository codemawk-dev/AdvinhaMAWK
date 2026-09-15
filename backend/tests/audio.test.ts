import { spawnSync } from 'node:child_process';
import ffmpegStatic from 'ffmpeg-static';
import { describe, expect, it, vi } from 'vitest';
import { ApplePreviewProvider } from '../src/audio/provider.js';
const binary = ffmpegStatic as unknown as string;
describe('áudio com FFmpeg real', () => {
  it('corta a duração no servidor e remove título do arquivo', async () => {
    const source = spawnSync(binary, ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=16', '-metadata', 'title=SEGREDO_RESPOSTA', '-f', 'mp3', 'pipe:1'], { windowsHide: true });
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
  it('remove silêncio inicial sem encurtar pistas e compartilha conversão concorrente', async () => {
    const input = spawnSync(binary, ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=16', '-af', 'adelay=300:all=1', '-f', 'mp3', 'pipe:1'], { windowsHide: true }).stdout;
    const fetcher = vi.fn(async () => new Response(new Uint8Array(input)));
    const provider = new ApplePreviewProvider(binary, fetcher);
    const durations = [0.1, 0.5, 2, 8, 15];
    const clips = await Promise.all(durations.map(seconds => provider.clip('https://audio-ssl.itunes.apple.com/exact.mp3', seconds)));
    expect(fetcher).toHaveBeenCalledTimes(1);
    clips.forEach((clip, index) => {
      expect(clip.subarray(0, 4).toString()).toBe('RIFF');
      expect(clip.readUInt32LE(40) / (44100 * 2)).toBe(durations[index]);
      expect(clip.length).toBe(44 + Math.round(durations[index]! * 44100) * 2);
    });
    await provider.clip('https://audio-ssl.itunes.apple.com/exact.mp3', 0.1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('repete uma falha transitória e aceita redirecionamento apenas para a Apple', async () => {
    const input = spawnSync(binary, ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=16', '-f', 'mp3', 'pipe:1'], { windowsHide: true }).stdout;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://audio-ssl.itunes.apple.com/new.mp3' } }))
      .mockResolvedValueOnce(new Response(new Uint8Array(input)));
    expect((await new ApplePreviewProvider(binary, fetcher).clip('https://audio-ssl.itunes.apple.com/old.mp3', 0.1)).length).toBe(8864);
    expect(fetcher).toHaveBeenCalledTimes(3);
    const external = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/secret' } }));
    await expect(new ApplePreviewProvider(binary, external).clip('https://audio-ssl.itunes.apple.com/old.mp3', 0.1)).rejects.toThrow();
    expect(external).toHaveBeenCalledTimes(1);
  });
});
