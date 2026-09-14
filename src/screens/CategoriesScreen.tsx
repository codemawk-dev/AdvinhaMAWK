import { useState } from 'react';
import { ChevronLeft, Check, Play } from 'lucide-react';
import { GENRE_CATEGORIES } from '../data/mock';
import type { ScreenType } from '../data/mock';

interface CategoriesScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export function CategoriesScreen({ onNavigate }: CategoriesScreenProps) {
  const [selectedGenre, setSelectedGenre] = useState('mix-brasil');

  const selectedName =
    GENRE_CATEGORIES.find((g) => g.id === selectedGenre)?.name ?? 'Mix Brasil';

  /* Split categories into featured, grid pairs, and full-width row items */
  const featured = GENRE_CATEGORIES[0]; // Mix Brasil
  const gridItems = GENRE_CATEGORIES.filter((g) => g.layout === 'card');
  const rowItems = GENRE_CATEGORIES.filter(
    (g) => g.layout === 'row' && g.id !== 'mix-brasil'
  );

  return (
    <div className="flex flex-col min-h-dvh bg-bg animate-fade-in">
      {/* Header */}
      <div className="flex flex-col w-full pt-3 pb-2 gap-2 px-6">
        <div className="flex justify-between items-center w-full">
          <button
            type="button"
            className="flex items-center justify-center rounded-full shrink-0 bg-surface border border-solid border-border w-9 h-9 cursor-pointer transition-colors hover:bg-surface-elevated"
          >
            <ChevronLeft size={18} color="#F3F4F6" strokeWidth={2.5} />
          </button>
          <div className="flex items-center py-1.25 px-3 rounded-full gap-1.5 bg-[#00E5FF1A] border border-solid border-[#00E5FF4D]">
            <span className="text-[11px] uppercase tracking-wider font-bold leading-3.5 text-secondary">
              Edição Brasil
            </span>
          </div>
        </div>
        <div className="flex flex-col pt-1 gap-1">
          <h1 className="text-[26px] tracking-[-0.02em] font-extrabold leading-8 text-text-primary">
            Escolha o Gênero
          </h1>
          <p className="text-[13px] font-medium leading-4 text-text-muted">
            Teste seus conhecimentos nos maiores clássicos nacionais.
          </p>
        </div>
      </div>

      {/* Genre list */}
      <div className="flex flex-col w-full py-3 px-6 gap-2.5">
        {/* Featured: Mix Brasil */}
        <button
          type="button"
          onClick={() => setSelectedGenre(featured.id)}
          className={`flex items-center justify-between py-3.5 px-4 rounded-[14px] cursor-pointer transition-all hover:brightness-110 ${
            selectedGenre === featured.id
              ? 'shadow-[0_4px_20px_#FF385C33] border-[1.5px] border-solid border-primary'
              : 'border-[1.5px] border-solid border-border'
          }`}
          style={{
            backgroundImage:
              selectedGenre === featured.id
                ? 'linear-gradient(135deg, rgba(255,56,92,0.15) 0%, rgba(0,229,255,0.1) 100%)'
                : 'none',
            backgroundColor:
              selectedGenre !== featured.id ? 'var(--color-surface)' : undefined,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10.5 h-10.5 flex items-center justify-center rounded-[10px] shrink-0 shadow-[0_4px_12px_#FF385C66]"
              style={{ backgroundImage: featured.iconBg }}
            >
              <featured.icon size={22} color={featured.iconColor} strokeWidth={2} />
            </div>
            <div className="flex flex-col gap-0.5 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold leading-4.5 text-text-primary">
                  {featured.name}
                </span>
                <span className="inline-block py-0.5 px-1.5 rounded-[4px] bg-[#FF385C33] text-[10px] font-bold leading-3 text-primary">
                  POPULAR
                </span>
              </div>
              <span className="text-xs font-medium leading-4 text-text-muted">
                {featured.description}
              </span>
            </div>
          </div>
          {selectedGenre === featured.id && (
            <div className="flex items-center justify-center rounded-full shrink-0 bg-primary w-5 h-5">
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </div>
          )}
        </button>

        {/* Grid: 2x2 */}
        {Array.from({ length: Math.ceil(gridItems.length / 2) }, (_, rowIdx) => (
          <div key={rowIdx} className="flex w-full gap-2.5">
            {gridItems.slice(rowIdx * 2, rowIdx * 2 + 2).map((genre) => (
              <button
                key={genre.id}
                type="button"
                onClick={() => setSelectedGenre(genre.id)}
                className={`grow basis-0 flex flex-col p-3.5 rounded-[14px] gap-2 cursor-pointer transition-all hover:brightness-110 text-left ${
                  selectedGenre === genre.id
                    ? 'border-[1.5px] border-solid border-primary shadow-[0_4px_20px_#FF385C33]'
                    : 'bg-surface border border-solid border-border'
                }`}
                style={
                  selectedGenre === genre.id
                    ? {
                        backgroundImage:
                          'linear-gradient(135deg, rgba(255,56,92,0.15) 0%, rgba(0,229,255,0.1) 100%)',
                      }
                    : undefined
                }
              >
                <div className="flex justify-between items-center">
                  <div
                    className="flex items-center justify-center rounded-lg shrink-0 w-8 h-8"
                    style={{ backgroundColor: genre.iconBg as string }}
                  >
                    <genre.icon size={18} color={genre.iconColor} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-semibold leading-3 text-text-muted">
                    {genre.trackCount} faixas
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold leading-4.5 text-text-primary">
                    {genre.name}
                  </span>
                  <span className="text-[11px] font-medium leading-3.5 text-text-muted">
                    {genre.artists}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ))}

        {/* Full-width row items */}
        {rowItems.map((genre) => (
          <button
            key={genre.id}
            type="button"
            onClick={() => setSelectedGenre(genre.id)}
            className={`flex items-center justify-between py-3 px-3.5 rounded-[14px] cursor-pointer transition-all hover:brightness-110 text-left ${
              selectedGenre === genre.id
                ? 'border-[1.5px] border-solid border-primary shadow-[0_4px_20px_#FF385C33]'
                : 'bg-surface border border-solid border-border'
            }`}
            style={
              selectedGenre === genre.id
                ? {
                    backgroundImage:
                      'linear-gradient(135deg, rgba(255,56,92,0.15) 0%, rgba(0,229,255,0.1) 100%)',
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center rounded-lg shrink-0 w-8 h-8"
                style={{ backgroundColor: genre.iconBg as string }}
              >
                <genre.icon size={16} color={genre.iconColor} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold leading-4 text-text-primary">
                  {genre.name}
                </span>
                <span className="text-[11px] font-medium leading-3.5 text-text-muted">
                  {genre.artists}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-semibold leading-3 text-text-muted">
              {genre.trackCount} faixas
            </span>
          </button>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col w-full mt-auto pt-3 pb-6 gap-2.5 px-6">
        {/* Duel CTA */}
        <button
          type="button"
          onClick={() => onNavigate('duel')}
          className="flex items-center justify-between py-4 px-5 rounded-2xl shadow-[0_6px_20px_#00E5FF40] border-[1.5px] border-solid border-secondary cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(255,56,92,0.2) 0%, rgba(0,229,255,0.2) 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-[10px] shrink-0 shadow-[0_4px_12px_#00E5FF66] w-10 h-10"
              style={{
                backgroundImage: 'linear-gradient(135deg, #00E5FF 0%, #0080CC 100%)',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2v6h6M2 14.5l5.5-5.5 3 3-5.5 5.5H2v-3z" />
                <path d="M14 6l4 4" />
                <path d="M13 18l3 3 5.5-5.5-3-3L13 18z" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-sm font-extrabold leading-4.5 text-text-primary">
                Criar Duelo 1x1
              </span>
              <span className="text-[11px] font-medium leading-3.5 text-secondary">
                Gere um link e desafie um amigo
              </span>
            </div>
          </div>
          <div className="py-1.5 px-3 rounded-full bg-secondary">
            <span className="text-[11px] font-extrabold leading-3.5 text-bg">
              DESAFIAR
            </span>
          </div>
        </button>

        {/* Play solo */}
        <button
          type="button"
          onClick={() => onNavigate('gameplay')}
          className="flex items-center justify-center w-full py-3.5 px-5 rounded-md gap-2 shadow-[0_4px_16px_#FF385C66] cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            backgroundImage: 'linear-gradient(135deg, #FF385C 0%, #D6294D 100%)',
          }}
        >
          <span className="text-sm font-bold leading-4.5 text-white">
            Jogar Solo ({selectedName})
          </span>
          <Play size={16} color="#FFFFFF" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
