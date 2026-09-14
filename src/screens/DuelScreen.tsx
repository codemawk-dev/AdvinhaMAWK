import { X, Clock, Check, Copy, Link } from 'lucide-react';
import { ActionButton } from '../components/ActionButton';
import { ProgressBar } from '../components/ProgressBar';
import { MOCK_DUEL, MOCK_SONGS } from '../data/mock';
import type { ScreenType } from '../data/mock';

interface DuelScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

const REACTIONS = ['🔥', '👏', '😱', '😎'];

export function DuelScreen({ onNavigate }: DuelScreenProps) {
  const duel = MOCK_DUEL;
  const [you, opponent] = duel.players;
  const song = MOCK_SONGS[2]; // Lapada Dela

  return (
    <div className="flex flex-col min-h-dvh bg-bg animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center w-full py-2.5 px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('categories')}
            className="flex items-center justify-center rounded-full shrink-0 bg-surface border border-solid border-border w-8 h-8 cursor-pointer transition-colors hover:bg-surface-elevated"
          >
            <X size={14} color="#8E95A5" strokeWidth={2.5} />
          </button>
          <div className="inline-block py-1 px-2.5 rounded-full bg-[#00E5FF1A] border border-solid border-[#00E5FF4D]">
            <span className="text-xs font-bold leading-4 text-secondary">
              {duel.genre}
            </span>
          </div>
        </div>
        <div className="flex items-center py-1.25 px-2.5 rounded-lg gap-1.5 bg-surface border border-solid border-border">
          <span className="text-[11px] font-bold leading-3.5 text-text-primary">
            {duel.matchId}
          </span>
          <Copy size={12} color="#8E95A5" />
        </div>
      </div>

      {/* Round info */}
      <div className="flex flex-col w-full pt-2.5 pb-3.5 gap-3 px-6">
        <div className="flex justify-between items-center w-full">
          <span className="text-[11px] uppercase tracking-[0.08em] font-bold leading-3.5 text-text-muted">
            Rodada {duel.round} de {duel.totalRounds}
          </span>
          <div className="flex items-center gap-1">
            {duel.roundResults.map((result, i) => {
              let dotClass = 'bg-border';
              let shadow = '';
              if (result === 'you') {
                dotClass = 'bg-secondary';
                shadow = 'shadow-[0_0_6px_#00E5FF]';
              } else if (result === 'opponent') {
                dotClass = 'bg-primary';
                shadow = 'shadow-[0_0_6px_#FF385C]';
              } else if (i === duel.round - 1) {
                dotClass = 'bg-text-primary';
              }
              return (
                <div
                  key={i}
                  className={`rounded-full shrink-0 w-2 h-2 ${dotClass} ${shadow}`}
                />
              );
            })}
          </div>
        </div>

        {/* Player vs Player */}
        <div className="flex items-center justify-between p-4 rounded-[18px] shadow-[0_10px_30px_#00000080] bg-surface border-[1.5px] border-solid border-border">
          {/* You */}
          <div className="flex flex-col items-center grow basis-0 gap-1.5">
            <div
              className="flex items-center justify-center rounded-full relative shrink-0 shadow-[0_0_16px_#00E5FF66] border-[3px] border-solid border-secondary w-14 h-14"
              style={{
                backgroundImage: 'linear-gradient(135deg, #00E5FF 0%, #0080CC 100%)',
              }}
            >
              <span className="text-xl font-extrabold leading-6 text-bg">
                {you.initials}
              </span>
              <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-success border-2 border-solid border-surface">
                <Check size={10} color="#FFFFFF" strokeWidth={3} />
              </div>
            </div>
            <span className="text-sm font-bold leading-4.5 text-text-primary">
              {you.name}
            </span>
            <div className="py-0.5 px-2.5 rounded-full bg-[#00E5FF26]">
              <span className="text-xs font-extrabold leading-4 text-secondary">
                {you.score} Ponto
              </span>
            </div>
            <span className="text-[11px] text-center font-semibold leading-3.5 text-success">
              {you.status}
            </span>
          </div>

          {/* VS badge */}
          <div className="flex flex-col items-center px-2 gap-1">
            <div
              className="w-9.5 h-9.5 flex items-center justify-center rounded-full shrink-0 shadow-[0_0_14px_#FF385C66]"
              style={{
                backgroundImage: 'linear-gradient(135deg, #FF385C 0%, #00E5FF 100%)',
              }}
            >
              <span className="text-[13px] font-extrabold italic leading-4 text-white">
                VS
              </span>
            </div>
            <span className="text-[10px] font-bold leading-3 text-text-muted">
              AO VIVO
            </span>
          </div>

          {/* Opponent */}
          <div className="flex flex-col items-center grow basis-0 gap-1.5">
            <div
              className="flex items-center justify-center rounded-full relative shrink-0 shadow-[0_0_16px_#FF385C66] border-[3px] border-solid border-primary w-14 h-14"
              style={{
                backgroundImage: 'linear-gradient(135deg, #FF385C 0%, #6B21A8 100%)',
              }}
            >
              <span className="text-xl font-extrabold leading-6 text-white">
                {opponent.initials}
              </span>
              <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-warning border-2 border-solid border-surface">
                <div className="rounded-full shrink-0 bg-white w-1.5 h-1.5" />
              </div>
            </div>
            <span className="text-sm font-bold leading-4.5 text-text-primary">
              {opponent.name}
            </span>
            <div className="py-0.5 px-2.5 rounded-full bg-[#FF385C26]">
              <span className="text-xs font-extrabold leading-4 text-primary">
                {opponent.score} Ponto
              </span>
            </div>
            <span className="text-[11px] text-center font-semibold leading-3.5 text-warning">
              {opponent.status}
            </span>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="flex flex-col items-center w-full py-2.5 px-6 gap-3">
        <div className="flex items-center py-1.5 px-4 rounded-full gap-2 bg-[#FF385C1A] border border-solid border-[#FF385C4D]">
          <Clock size={14} color="#FF385C" strokeWidth={2.5} />
          <span className="text-xs font-bold leading-4 text-primary">
            00:0{duel.timeRemaining} restantes
          </span>
        </div>

        {/* Progress bar */}
        <ProgressBar
          currentCheckpoint={1}
          variant="duel"
          duelLabels={{ you: 'VC', opponent: 'LS' }}
        />
      </div>

      {/* Guess feed */}
      <div className="flex flex-col w-full py-2 px-6 gap-2">
        {/* Your correct guess */}
        <div className="flex items-center justify-between py-3 px-3.5 rounded-md bg-[#10B9811A] border-[1.5px] border-solid border-[#10B98166]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-full shrink-0 bg-success w-6 h-6">
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold leading-4 text-text-primary">
                {song.title}
              </span>
              <span className="text-[11px] font-medium leading-3.5 text-text-muted">
                {song.artist}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-extrabold leading-4 text-success">0.5s</span>
            <span className="text-[10px] font-semibold leading-3 text-text-muted">
              CRAVOU
            </span>
          </div>
        </div>

        {/* Opponent status */}
        <div className="flex items-center justify-between py-3 px-3.5 rounded-md bg-surface border border-dashed border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-full shrink-0 bg-[#F59E0B33] w-6 h-6">
              <div className="rounded-full shrink-0 bg-warning w-2 h-2 animate-dot-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold leading-4 text-text-muted">
                Lucas está ouvindo a prévia...
              </span>
              <span className="text-[11px] font-medium leading-3.5 text-[#525866]">
                Ainda tem 08s para responder
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold leading-3.5 text-warning">
            DIGITANDO
          </span>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex flex-col w-full mt-auto pt-3 pb-6 gap-2.5 px-6">
        {/* Reactions */}
        <div className="flex justify-between items-center w-full py-2 px-3 rounded-md bg-surface border border-solid border-border">
          <span className="text-[11px] font-bold leading-3.5 text-text-muted">
            Reações:
          </span>
          <div className="flex items-center gap-2">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex items-center justify-center rounded-lg shrink-0 bg-surface-elevated w-8 h-8 cursor-pointer transition-transform hover:scale-110 active:scale-95 text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <ActionButton
          label="Convidar Mais Amigos"
          variant="cyan"
          icon={Link}
          iconPosition="left"
          onClick={() => {}}
        />
      </div>
    </div>
  );
}
