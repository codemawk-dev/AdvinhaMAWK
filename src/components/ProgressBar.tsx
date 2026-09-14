import { TIME_CHECKPOINTS, type TimeCheckpoint } from '../data/mock';

interface ProgressBarProps {
  currentCheckpoint: number;
  variant?: 'solo' | 'duel';
  duelLabels?: { you: string; opponent: string };
}

const SEGMENT_WEIGHTS = [1, 1.5, 3, 3.5, 4];

export function ProgressBar({
  currentCheckpoint,
  variant = 'solo',
  duelLabels,
}: ProgressBarProps) {
  const currentIndex = TIME_CHECKPOINTS.indexOf(
    currentCheckpoint as TimeCheckpoint
  );

  return (
    <div className="flex flex-col w-full gap-2">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <span className="text-[11px] uppercase tracking-[0.06em] font-bold leading-[14px] text-text-muted">
          {variant === 'solo' ? 'Tempo Liberado' : 'Corrida de Acerto'}
        </span>
        {variant === 'solo' ? (
          <span className="text-xs font-semibold leading-4 text-secondary">
            {currentCheckpoint}s / 15.0s
          </span>
        ) : (
          <span className="text-[11px] font-semibold leading-[14px] text-secondary">
            Quem acertar primeiro pontua!
          </span>
        )}
      </div>

      {/* Bar segments */}
      <div className="flex items-center w-full h-3 gap-1.5">
        {SEGMENT_WEIGHTS.map((weight, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          let segmentClass = 'bg-surface-elevated border border-solid border-border';
          let style: React.CSSProperties = {};

          if (isCompleted && variant === 'solo') {
            segmentClass = 'shadow-[0_0_10px_#FF385C66]';
            style = {
              backgroundImage:
                'linear-gradient(90deg, #FF385C 0%, #FF6B81 100%)',
            };
          } else if (isCurrent && variant === 'solo') {
            segmentClass = 'shadow-[0_0_10px_#00E5FF66] bg-secondary';
          } else if (isCompleted && variant === 'duel') {
            segmentClass = 'shadow-[0_0_10px_#00E5FF80] bg-secondary';
          } else if (isCurrent && variant === 'duel') {
            segmentClass = 'shadow-[0_0_10px_#FF385C80] bg-primary';
          }

          return (
            <div
              key={i}
              className={`h-2.5 rounded-[4px] ${segmentClass}`}
              style={{ flexGrow: weight, flexBasis: '0%', ...style }}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between items-center w-full pt-0.5">
        {TIME_CHECKPOINTS.map((t, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          let labelColor = 'text-text-muted';
          let fontWeight = 'font-semibold';

          if (variant === 'solo') {
            if (isCompleted) {
              labelColor = 'text-primary';
              fontWeight = 'font-bold';
            } else if (isCurrent) {
              labelColor = 'text-secondary';
              fontWeight = 'font-bold';
            }
          } else {
            if (isCompleted) {
              labelColor = 'text-secondary';
              fontWeight = 'font-extrabold';
            } else if (isCurrent) {
              labelColor = 'text-primary';
              fontWeight = 'font-extrabold';
            }
          }

          const label =
            variant === 'duel' && duelLabels
              ? isCompleted
                ? `${t}s [${duelLabels.you}]`
                : isCurrent
                  ? `${t}s [${duelLabels.opponent}]`
                  : `${t}s`
              : `${t}s`;

          return (
            <span
              key={t}
              className={`text-[10px] leading-3 ${fontWeight} ${labelColor}`}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
