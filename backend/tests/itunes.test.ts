import { describe, expect, it, vi } from 'vitest';
import { ITunesClient, isAppleAudioUrl } from '../src/catalog/itunes-client.js';
const track = { kind: 'song', artistId: 1, trackId: 10, trackName: 'Canção', artistName: 'Artista', previewUrl: 'https://audio-ssl.itunes.apple.com/audio.m4a' };
describe('ITunesClient', () => {
  it('usa filtros BR/music/song e não precisa de chave', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ resultCount: 1, results: [track] })));
    const tracks = await new ITunesClient(0, fetcher).searchArtist('Artista');
    const url = new URL(String(fetcher.mock.calls[0]![0]));
    expect(url.searchParams.get('country')).toBe('BR'); expect(url.searchParams.get('entity')).toBe('song');
    expect(url.searchParams.get('media')).toBe('music'); expect(tracks).toHaveLength(1);
  });
  it('repete falhas transitórias e respeita o limite de tentativas', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));
    await expect(new ITunesClient(0, fetcher).searchArtist('Artista')).rejects.toThrow('temporariamente');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('não interpreta payload quebrado como catálogo vazio', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ resultCount: 1, results: [{ kind: 'song' }] })));
    await expect(new ITunesClient(0, fetcher).searchArtist('Artista')).rejects.toThrow();
  });
  it('serializa requisições concorrentes e aplica intervalo', async () => {
    const timestamps: number[] = [];
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      timestamps.push(Date.now()); return new Response(JSON.stringify({ resultCount: 1, results: [track] }));
    });
    const client = new ITunesClient(40, fetcher);
    await Promise.all([client.searchArtist('A'), client.searchArtist('B'), client.searchArtist('C')]);
    expect(timestamps[2]! - timestamps[0]!).toBeGreaterThanOrEqual(70);
  });
  it.each(['http://audio-ssl.itunes.apple.com/x', 'https://evil.test/x', 'https://a.mzstatic.com.evil.test/x', 'https://user:pass@a.mzstatic.com/x', 'https://a.mzstatic.com:444/x', 'http://127.0.0.1'])('rejeita origem não confiável %s', url => expect(isAppleAudioUrl(url)).toBe(false));
});
