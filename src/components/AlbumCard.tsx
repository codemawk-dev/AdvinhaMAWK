import { Music, Play } from 'lucide-react';
import type { Song } from '../data/mock';

interface AlbumCardProps {
  song: Song;
  variant: 'victory' | 'defeat';
}

export function AlbumCard({ song, variant }: AlbumCardProps) {
  const albumGradient =
    variant === 'victory'
      ? 'linear-gradient(145deg, #FF385C 0%, #3D1119 100%)'
      : 'linear-gradient(145deg, #1E2A3A 0%, #151B28 100%)';

  const iconColor = variant === 'victory' ? '#FFFFFF' : '#00E5FF';
  const albumLabelColor =
    variant === 'victory' ? 'text-white/80' : 'text-secondary';
  const playBg = variant === 'victory' ? 'bg-success' : 'bg-primary';
  const progressColor =
    variant === 'victory' ? 'bg-success' : 'bg-primary';
  const progressWidth = variant === 'victory' ? '45%' : '25%';

  const currentTime = variant === 'victory' ? '0:15' : '0:45';
  const totalTime =
    `${Math.floor(song.durationSec / 60)}:${String(song.durationSec % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center w-full p-5 rounded-lg gap-4 shadow-[0_16px_36px_#00000080] bg-surface border-[1.5px] border-solid border-border">
      {/* Reveal label (defeat only) */}
      {variant === 'defeat' && (
        <span className="text-[11px] uppercase tracking-[0.08em] font-bold leading-[14px] text-text-muted">
          A música secreta era:
        </span>
      )}

      {/* Album art + vinyl */}
      <div className="w-[170px] h-[170px] flex items-center justify-center relative shrink-0">
        {/* Vinyl disc */}
        <div className="absolute -right-3.5 w-[150px] h-[150px] flex items-center justify-center rounded-full shadow-[0_8px_24px_#00000099] border-2 border-solid border-[#333948]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #2A2D38 12%, #1D1F27 35%, #17191F 70%)',
          }}
        >
          <div className="rounded-full shrink-0 bg-primary border-[3px] border-solid border-[#111318] w-10 h-10" />
        </div>

        {/* Album cover */}
        <div
          className="flex flex-col justify-between p-3.5 rounded-md overflow-clip relative shrink-0 shadow-[0_10px_25px_#00000080] border border-solid border-white/15 w-40 h-40"
          style={{ backgroundImage: albumGradient }}
        >
          <span className={`text-[11px] uppercase tracking-[0.08em] font-bold leading-[14px] ${albumLabelColor}`}>
            {song.album}
          </span>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-center rounded-sm shrink-0 bg-white/20 w-7 h-7">
              <Music size={16} color={iconColor} fill={iconColor} />
            </div>
          </div>
        </div>
      </div>

      {/* Song info */}
      <div className="flex flex-col items-center w-full gap-1">
        <h3 className="text-[19px] tracking-[-0.01em] text-center font-bold leading-6 text-text-primary">
          {song.title}
        </h3>
        <p className="text-sm text-center font-semibold leading-[18px] text-text-muted">
          {song.artist} • {song.year}
        </p>
      </div>

      {/* Mini player */}
      <div className="flex items-center w-full py-2.5 px-3.5 rounded-[10px] gap-3 bg-surface-elevated">
        <div className={`flex items-center justify-center shrink-0 rounded-full ${playBg} w-8 h-8`}>
          <Play size={14} fill="#FFFFFF" color="#FFFFFF" className="ml-0.5" />
        </div>
        <div className="grow flex flex-col gap-1">
          <div className="h-1 w-full rounded-[2px] overflow-clip bg-border">
            <div
              className={`h-full rounded-[2px] ${progressColor}`}
              style={{ width: progressWidth }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] font-semibold leading-3 text-text-muted">
              {currentTime}
            </span>
            <span className="text-[10px] font-semibold leading-3 text-text-muted">
              {totalTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
