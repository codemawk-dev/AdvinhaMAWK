import { useState } from 'react';
import { Play, Search, SkipForward, ArrowRight, Flame, HelpCircle, Music } from 'lucide-react';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { ProgressBar } from '../components/ProgressBar';
import { GuessHistory } from '../components/GuessHistory';
import { MOCK_GUESSES } from '../data/mock';
import type { ScreenType } from '../data/mock';

interface GameplayScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function GameplayScreen({ onNavigate }: GameplayScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [guess, setGuess] = useState('');

  return (
    <div className="flex flex-col min-h-dvh bg-bg animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center w-full py-3 px-6">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-full shrink-0 shadow-[0_4px_14px_#FF385C66] w-8 h-8"
            style={{
              backgroundImage: 'linear-gradient(135deg, #FF385C 0%, #6B21A8 100%)',
            }}
          >
            <Music size={16} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <span className="text-lg tracking-[-0.02em] font-bold leading-[22px] text-text-primary">
            Advinha Song
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center py-1 px-2.5 rounded-full gap-1 bg-surface border border-solid border-border">
            <Flame size={14} fill="#FF385C" color="#FF385C" />
            <span className="text-xs font-bold leading-4 text-text-primary">5</span>
          </div>
          <button
            type="button"
            className="flex items-center justify-center rounded-full shrink-0 bg-surface border border-solid border-border w-8 h-8 cursor-pointer transition-colors hover:bg-surface-elevated"
          >
            <HelpCircle size={16} color="#8E95A5" />
          </button>
        </div>
      </div>

      {/* Play button area */}
      <div className="flex flex-col items-center justify-center w-full pt-5 pb-4 gap-4 px-6">
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-[150px] h-[150px] flex items-center justify-center rounded-full relative shrink-0 shadow-[inset_0_0_20px_#000000CC,0_10px_30px_#00000099] border-[3px] border-solid border-border cursor-pointer transition-transform hover:scale-105 active:scale-95"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #2A2D38 10%, #1D1F27 35%, #17191F 70%, #1D1F27 100%)',
          }}
        >
          {/* Decorative rings */}
          <div className="absolute w-[110px] h-[110px] rounded-full border border-dashed border-white/8" />
          <div className="absolute rounded-full border border-solid border-white/5 w-20 h-20" />
          {/* Play icon */}
          <div
            className="w-[58px] h-[58px] flex items-center justify-center rounded-full shrink-0 shadow-[0_0_24px_#FF385C80,0_4px_12px_#00000066] transition-shadow"
            style={{
              backgroundImage: 'linear-gradient(135deg, #FF385C 0%, #D6294D 100%)',
            }}
          >
            <Play size={22} fill="#FFFFFF" color="#FFFFFF" className="ml-[3px]" />
          </div>
        </button>

        <AudioVisualizer isPlaying={isPlaying} />

        <p className="text-[13px] text-center font-medium leading-4 text-text-muted">
          Toque para ouvir a prévia (1.0s disponível)
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col w-full pt-2.5 pb-4 px-6">
        <ProgressBar currentCheckpoint={1} variant="solo" />
      </div>

      {/* Guess history */}
      <div className="flex flex-col w-full py-2.5 px-6">
        <GuessHistory guesses={MOCK_GUESSES} />
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col w-full mt-auto pt-3 pb-6 gap-3 px-6">
        {/* Search input */}
        <div className="flex items-center py-3.5 px-4 rounded-md gap-2.5 shadow-[inset_0_2px_4px_#0000004D] bg-surface border-[1.5px] border-solid border-border">
          <Search size={18} className="text-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Digite a música ou artista..."
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="grow text-sm font-medium leading-[18px] text-text-primary placeholder:text-text-muted bg-transparent outline-none border-none"
          />
          <div className="py-0.5 px-1.5 rounded-[4px] bg-border">
            <span className="text-[10px] font-bold leading-3 text-text-muted">↵</span>
          </div>
        </div>

        {/* Buttons row */}
        <div className="flex items-center w-full gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('gameover')}
            className="grow flex items-center justify-center py-3.5 px-4 rounded-md gap-1.5 bg-surface-elevated border border-solid border-border cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <SkipForward size={16} color="#F3F4F6" />
            <span className="text-[13px] font-semibold leading-4 text-text-primary">
              Pular (+4s)
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('victory')}
            className="flex items-center justify-center py-3.5 px-5 rounded-md gap-2 shadow-[0_4px_16px_#FF385C66] cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              flexGrow: 1.6,
              backgroundImage: 'linear-gradient(135deg, #FF385C 0%, #D6294D 100%)',
            }}
          >
            <span className="text-sm font-bold leading-[18px] text-white">
              Enviar Palpite
            </span>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
