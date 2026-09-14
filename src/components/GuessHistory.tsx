import { X } from 'lucide-react';
import type { GuessEntry } from '../data/mock';

interface GuessHistoryProps {
  guesses: GuessEntry[];
}

export function GuessHistory({ guesses }: GuessHistoryProps) {
  return (
    <div className="flex flex-col w-full gap-2">
      {guesses.map((guess) => {
        if (guess.status === 'wrong') {
          return (
            <div
              key={guess.id}
              className="flex items-center justify-between py-2.5 px-3.5 rounded-lg bg-surface border border-solid border-[#EF444466]"
            >
              <div className="flex items-center gap-2">
                <X size={14} className="text-danger shrink-0" strokeWidth={2.5} />
                <span className="text-[13px] font-medium leading-4 text-text-primary">
                  {guess.text}
                </span>
              </div>
              <span className="text-[11px] font-semibold leading-3.5 text-danger">
                {guess.checkpoint}s
              </span>
            </div>
          );
        }

        if (guess.status === 'current') {
          return (
            <div
              key={guess.id}
              className="flex items-center justify-between py-2.5 px-3.5 rounded-lg bg-[#00E5FF0A] border border-dashed border-[#00E5FF80]"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-full shrink-0 shadow-[0_0_8px_#00E5FF] bg-secondary w-2 h-2 animate-dot-pulse" />
                <span className="text-[13px] font-medium leading-4 text-text-muted">
                  {guess.text}
                </span>
              </div>
              <span className="text-[11px] font-semibold leading-3.5 text-secondary">
                {guess.checkpoint}s
              </span>
            </div>
          );
        }

        return (
          <div
            key={guess.id}
            className="flex items-center opacity-50 py-2.5 px-3.5 rounded-lg bg-[#12141A] border border-solid border-surface-elevated"
          >
            <span className="text-[13px] font-medium leading-4 text-text-muted">
              {guess.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
