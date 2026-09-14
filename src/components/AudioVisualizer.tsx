interface AudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  variant?: 'primary' | 'muted';
}

const BAR_HEIGHTS = [2.5, 4.5, 6.5, 3.5, 5.5, 2, 4, 6, 3, 5, 2.5, 3.75, 5.5, 2, 4];

export function AudioVisualizer({
  isPlaying,
  barCount = 15,
  variant = 'primary',
}: AudioVisualizerProps) {
  const activeCount = isPlaying ? 5 : 0;

  return (
    <div className="flex items-center justify-center h-7 gap-1">
      {BAR_HEIGHTS.slice(0, barCount).map((height, i) => {
        const isActive = i < activeCount;
        return (
          <div
            key={i}
            className={`w-0.75 rounded-xs shrink-0 transition-colors duration-300 ${
              isActive ? 'bg-primary' : variant === 'muted' ? 'bg-border' : 'bg-border'
            }`}
            style={{
              height: `${height * 4}px`,
              animation: isActive
                ? `audio-bar 1.2s ease-in-out ${i * 0.1}s infinite`
                : 'none',
              transformOrigin: 'center',
            }}
          />
        );
      })}
    </div>
  );
}
