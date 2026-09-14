import { XCircle, RotateCcw, BarChart3, X } from 'lucide-react';
import { ActionButton } from '../components/ActionButton';
import { AlbumCard } from '../components/AlbumCard';
import { MOCK_SONGS } from '../data/mock';
import type { ScreenType } from '../data/mock';

interface GameOverScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function GameOverScreen({ onNavigate }: GameOverScreenProps) {
  const song = MOCK_SONGS[1]; // Midnight City

  return (
    <div className="flex flex-col min-h-dvh bg-bg animate-fade-in">
      {/* Status bar */}
      <div className="flex justify-between items-center w-full py-3 px-6">
        <div className="flex items-center gap-1.5">
          <div className="rounded-full shrink-0 shadow-[0_0_10px_#EF4444] bg-danger w-2 h-2" />
          <span className="text-sm font-bold leading-4.5 text-danger">
            FIM DE JOGO
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('categories')}
          className="flex items-center justify-center rounded-full shrink-0 bg-surface border border-solid border-border w-8 h-8 cursor-pointer transition-colors hover:bg-surface-elevated"
        >
          <X size={16} color="#8E95A5" />
        </button>
      </div>

      {/* Failure message */}
      <div className="flex flex-col items-center justify-center w-full pt-3 pb-2 gap-1.5 px-6 animate-slide-up">
        <div className="flex items-center justify-center rounded-full shrink-0 shadow-[0_0_20px_#EF444440] bg-[#EF444426] border-[1.5px] border-solid border-[#EF444466] w-12 h-12">
          <XCircle size={24} color="#EF4444" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl tracking-[-0.02em] text-center font-extrabold leading-7.5 text-text-primary">
          Não Foi Dessa Vez!
        </h1>
        <div className="inline-flex items-center py-1.5 px-3.5 rounded-full gap-1.5 bg-[#EF44441F] border border-solid border-[#EF44444D]">
          <span className="text-[13px] text-center font-bold leading-4 text-danger">
            5 tentativas esgotadas
          </span>
          <span className="text-xs text-center font-medium leading-4 text-text-muted">
            • 15.0s
          </span>
        </div>
      </div>

      {/* Album card */}
      <div className="flex flex-col items-center w-full py-4 px-6">
        <AlbumCard song={song} variant="defeat" />
      </div>

      {/* Actions */}
      <div className="flex flex-col w-full mt-auto pt-3 pb-6 gap-2.5 px-6">
        <ActionButton
          label="Jogar Modo Prática"
          variant="primary"
          icon={RotateCcw}
          iconPosition="left"
          onClick={() => onNavigate('gameplay')}
        />
        <ActionButton
          label="Ver Estatísticas"
          variant="outline"
          icon={BarChart3}
          iconPosition="left"
        />
        <div className="pt-0.5">
          <p className="text-[11px] text-center font-medium leading-3.5 text-text-muted">
            Novo desafio diário em 05:22:18
          </p>
        </div>
      </div>
    </div>
  );
}
