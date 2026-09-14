import { CheckCircle, ChevronRight, Share2, X } from 'lucide-react';
import { ActionButton } from '../components/ActionButton';
import { AlbumCard } from '../components/AlbumCard';
import { MOCK_SONGS } from '../data/mock';
import type { ScreenType } from '../data/mock';

interface VictoryScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function VictoryScreen({ onNavigate }: VictoryScreenProps) {
  const song = MOCK_SONGS[0]; // Blinding Lights

  return (
    <div className="flex flex-col min-h-dvh bg-bg animate-fade-in">
      {/* Status bar */}
      <div className="flex justify-between items-center w-full py-3 px-6">
        <div className="flex items-center gap-1.5">
          <div className="rounded-full shrink-0 shadow-[0_0_10px_#10B981] bg-success w-2 h-2" />
          <span className="text-sm font-bold leading-[18px] text-success">
            DESAFIO DIÁRIO CONCLUÍDO
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

      {/* Success message */}
      <div className="flex flex-col items-center justify-center w-full pt-3 pb-2 gap-1.5 px-6 animate-slide-up">
        <div className="flex items-center justify-center rounded-full shrink-0 shadow-[0_0_20px_#10B98140] bg-[#10B98126] border-[1.5px] border-solid border-[#10B98166] w-12 h-12">
          <CheckCircle size={24} color="#10B981" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl tracking-[-0.02em] text-center font-extrabold leading-[30px] text-text-primary">
          Você Mandou Muito Bem!
        </h1>
        <div className="inline-flex items-center py-1.5 px-3.5 rounded-full gap-1.5 bg-[#10B9811F] border border-solid border-[#10B9814D]">
          <span className="text-[13px] text-center font-bold leading-4 text-success">
            Acertou em 1.0s
          </span>
          <span className="text-xs text-center font-medium leading-4 text-text-muted">
            • 2ª tentativa
          </span>
        </div>
      </div>

      {/* Album card */}
      <div className="flex flex-col items-center w-full py-4 px-6">
        <AlbumCard song={song} variant="victory" />
      </div>

      {/* Actions */}
      <div className="flex flex-col w-full mt-auto pt-3 pb-6 gap-2.5 px-6">
        <ActionButton
          label="Próxima Música"
          variant="success"
          icon={ChevronRight}
          iconPosition="right"
          onClick={() => onNavigate('gameplay')}
        />
        <ActionButton
          label="Compartilhar Resultado"
          variant="outline"
          icon={Share2}
          iconPosition="left"
        />
        <div className="pt-0.5">
          <p className="text-[11px] text-center font-medium leading-[14px] text-text-muted">
            Próximo desafio diário em 05:22:18
          </p>
        </div>
      </div>
    </div>
  );
}
