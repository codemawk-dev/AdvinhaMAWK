import { spawn } from 'node:child_process';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import ffmpegStatic from 'ffmpeg-static';
import { AppError } from '../core/errors.js';
import { isAppleAudioUrl } from '../catalog/itunes-client.js';
export interface AudioProvider {
  clip(source: string, duration: number, signal?: AbortSignal): Promise<Buffer>;
}
export class ApplePreviewProvider implements AudioProvider {
  private active = 0;
  constructor(private binary: string = ffmpegStatic as unknown as string, private fetcher: typeof fetch = fetch) {}
  async clip(source: string, duration: number, signal?: AbortSignal): Promise<Buffer> {
    if (!isAppleAudioUrl(source) || ![1, 3, 5, 10, 15].includes(duration)) throw new AppError(502, 'INVALID_AUDIO', 'Fonte de áudio inválida.');
    if (this.active >= 4) throw new AppError(503, 'AUDIO_BUSY', 'Áudio ocupado. Tente novamente.');
    this.active++;
    const controller = new AbortController();
    const abort = AbortSignal.any([controller.signal, AbortSignal.timeout(20000), ...(signal ? [signal] : [])]);
    try {
      const response = await this.fetcher(source, { signal: abort, redirect: 'error' });
      if (!response.ok || !response.body) throw new Error('Upstream audio unavailable');
      const process = spawn(this.binary, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-t', String(duration),
        '-vn', '-map_metadata', '-1', '-ac', '2', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '96k',
        '-id3v2_version', '0', '-write_xing', '0', '-f', 'mp3', 'pipe:1'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], signal: abort });
      let received = 0;
      const limit = new Transform({ transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length;
        callback(received > 8 * 1024 * 1024 ? new Error('Audio input too large') : null, chunk);
      } });
      // Consume stderr without ever returning upstream URLs or metadata to the player.
      process.stderr.resume();
      const chunks: Buffer[] = [];
      let outputSize = 0;
      process.stdout.on('data', (chunk: Buffer) => {
        outputSize += chunk.length;
        if (outputSize > 512 * 1024) controller.abort(); else chunks.push(chunk);
      });
      const completed = new Promise<void>((resolve, reject) => {
        process.once('error', reject);
        process.once('close', code => code === 0 ? resolve() : reject(new Error('Audio conversion failed')));
      });
      const input = pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), limit, process.stdin)
        .catch(error => { if ((error as NodeJS.ErrnoException).code !== 'EPIPE' && (error as NodeJS.ErrnoException).code !== 'ERR_STREAM_PREMATURE_CLOSE') controller.abort(); });
      // FFmpeg closes stdin as soon as the requested clip is complete.
      await completed;
      controller.abort();
      await input.catch(() => undefined);
      if (!outputSize) throw new Error('Empty audio');
      return Buffer.concat(chunks);
    } catch {
      throw new AppError(502, 'AUDIO_UNAVAILABLE', 'Não foi possível reproduzir o trecho. Tente novamente.');
    } finally { controller.abort(); this.active--; }
  }
}
