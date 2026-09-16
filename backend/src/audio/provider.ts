import { audiblePassage } from './passage.js';
import { spawn } from 'node:child_process';
import ffmpegStatic from 'ffmpeg-static';
import { AppError } from '../core/errors.js';
import { isAppleAudioUrl } from '../catalog/itunes-client.js';
export interface AudioProvider { clip(source: string, duration: number, signal?: AbortSignal): Promise<Buffer> }
export class AudioSourceError extends AppError {
  constructor(public permanent: boolean) { super(502, 'AUDIO_UNAVAILABLE', 'Não foi possível preparar este trecho. Sua tentativa foi preservada.'); }
}
const RATE = 44100;
const MAX_PCM = RATE * 2 * 15;
export function wave(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
export class ApplePreviewProvider implements AudioProvider {
  private cache = new Map<string, { pcm: Buffer; expires: number }>();
  private pending = new Map<string, Promise<Buffer>>();
  private cacheBytes = 0;
  constructor(private binary: string = ffmpegStatic as unknown as string, private fetcher: typeof fetch = fetch) {}
  async clip(source: string, duration: number, signal?: AbortSignal): Promise<Buffer> {
    if (!isAppleAudioUrl(source) || ![0.1, 0.5, 1, 2, 3, 5, 8, 10, 15].includes(duration)) throw new AppError(502, 'INVALID_AUDIO', 'Fonte de áudio inválida.');
    if (signal?.aborted) throw new AppError(499, 'AUDIO_CANCELLED', 'Reprodução cancelada.');
    const pcm = await this.source(source);
    if (signal?.aborted) throw new AppError(499, 'AUDIO_CANCELLED', 'Reprodução cancelada.');
    // PCM/WAV avoids MP3 padding: even the 100 ms clue has an exact duration.
    return wave(pcm.subarray(0, Math.round(duration * RATE) * 2));
  }
  private source(source: string): Promise<Buffer> {
    const cached = this.cache.get(source);
    if (cached && cached.expires > Date.now()) {
      this.cache.delete(source); this.cache.set(source, cached); return Promise.resolve(cached.pcm);
    }
    if (cached) { this.cacheBytes -= cached.pcm.length; this.cache.delete(source); }
    const pending = this.pending.get(source);
    if (pending) return pending;
    if (this.pending.size >= 4) return Promise.reject(new AppError(503, 'AUDIO_BUSY', 'Preparando outros trechos. Tente novamente em instantes.'));
    const work = this.prepare(source).then(pcm => {
      while (this.cacheBytes + pcm.length > 32 * 1024 * 1024 && this.cache.size) {
        const oldest = this.cache.keys().next().value!;
        this.cacheBytes -= this.cache.get(oldest)!.pcm.length; this.cache.delete(oldest);
      }
      this.cache.set(source, { pcm, expires: Date.now() + 15 * 60000 }); this.cacheBytes += pcm.length;
      return pcm;
    }).finally(() => this.pending.delete(source));
    this.pending.set(source, work);
    return work;
  }
  private async download(source: string): Promise<Buffer> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        let url = source;
        const signal = AbortSignal.timeout(8000);
        for (let redirects = 0; redirects <= 3; redirects++) {
          const response = await this.fetcher(url, { signal, redirect: 'manual' });
          if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get('location');
            await response.body?.cancel();
            if (!location) throw new AudioSourceError(true);
            url = new URL(location, url).href;
            if (!isAppleAudioUrl(url)) throw new AudioSourceError(true);
            continue;
          }
          if (!response.ok || !response.body) {
            await response.body?.cancel();
            throw new AudioSourceError([403, 404, 410].includes(response.status));
          }
          const chunks: Buffer[] = []; let bytes = 0;
          for await (const chunk of response.body) {
            bytes += chunk.length;
            if (bytes > 8 * 1024 * 1024) throw new AudioSourceError(true);
            chunks.push(Buffer.from(chunk));
          }
          return Buffer.concat(chunks);
        }
        throw new AudioSourceError(true);
      } catch (error) {
        if (error instanceof AudioSourceError && error.permanent) throw error;
        if (attempt === 1) throw new AudioSourceError(false);
      }
    }
    throw new AudioSourceError(false);
  }
  private async prepare(source: string): Promise<Buffer> {
    const input = await this.download(source);
    return new Promise<Buffer>((resolve, reject) => {
      const child = spawn(this.binary, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0',
        '-af', 'silenceremove=start_periods=1:start_duration=0.005:start_threshold=-55dB,asetpts=N/SR/TB',
        '-t', '30', '-vn', '-map_metadata', '-1', '-ac', '1', '-ar', String(RATE), '-f', 's16le', 'pipe:1'],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      const chunks: Buffer[] = []; let size = 0; let failed = false;
      const timer = setTimeout(() => { failed = true; child.kill(); }, 10000);
      child.stderr.resume();
      child.stdin.on('error', () => {});
      child.once('error', () => { clearTimeout(timer); reject(new AudioSourceError(false)); });
      child.stdout.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > RATE * 2 * 31) { failed = true; child.kill(); } else chunks.push(chunk);
      });
      child.once('close', code => {
        clearTimeout(timer);
        if (failed || code !== 0 || size < MAX_PCM) { reject(new AudioSourceError(!failed)); return; }
        const passage = audiblePassage(Buffer.concat(chunks));
        if (!passage) { reject(new AudioSourceError(true)); return; }
        resolve(passage);
      });
      child.stdin.end(input);
    });
  }
}
