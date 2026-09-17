import type { PrismaClient } from '@prisma/client';
export async function transferCatalog(source: PrismaClient, target: PrismaClient, report: (songs: number) => void = () => {}) {
  const categories = await source.internalCategory.findMany();
  const artists = await source.artist.findMany();
  await target.internalCategory.createMany({ data: categories, skipDuplicates: true });
  await target.artist.createMany({ data: artists, skipDuplicates: true });
  const remoteArtists = await target.artist.findMany();
  const artistIds = new Map(artists.map(artist => {
    const remote = remoteArtists.find(candidate => candidate.normalizedName === artist.normalizedName || (!!artist.appleArtistId && candidate.appleArtistId === artist.appleArtistId));
    if (!remote) throw new Error('Artista sem correspondência no catálogo de destino.');
    return [artist.id, remote.id];
  }));
  let cursor: string | undefined;
  let inserted = 0;
  for (;;) {
    const songs = await source.song.findMany({ take: 250, orderBy: { id: 'asc' }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    if (!songs.length) break;
    const result = await target.song.createMany({ data: songs.map(song => ({ ...song, artistId: artistIds.get(song.artistId)! })), skipDuplicates: true });
    inserted += result.count;
    report(inserted);
    cursor = songs[songs.length - 1]!.id;
  }
  return { inserted };
}
