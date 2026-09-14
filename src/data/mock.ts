import type { LucideIcon } from 'lucide-react';
import {
  Star,
  PlayCircle,
  Music,
  Volume2,
  AudioLines,
  Circle,
} from 'lucide-react';

/* ── Time Checkpoints ── */
export const TIME_CHECKPOINTS = [0.5, 1, 5, 10, 15] as const;
export type TimeCheckpoint = (typeof TIME_CHECKPOINTS)[number];

/* ── Genre Categories ── */
export interface GenreCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trackCount: number;
  description: string;
  artists: string;
  layout: 'card' | 'row';
}

export const GENRE_CATEGORIES: GenreCategory[] = [
  {
    id: 'mix-brasil',
    name: 'Mix Brasil',
    icon: Star,
    iconColor: '#FFFFFF',
    iconBg: 'linear-gradient(135deg, #FF385C 0%, #6B21A8 100%)',
    trackCount: 0,
    description: 'Todos os ritmos misturados',
    artists: '',
    layout: 'row',
  },
  {
    id: 'pagode-samba',
    name: 'Pagode & Samba',
    icon: PlayCircle,
    iconColor: '#00E5FF',
    iconBg: '#00E5FF26',
    trackCount: 140,
    description: '',
    artists: 'Thiaguinho, Zeca...',
    layout: 'card',
  },
  {
    id: 'sertanejo',
    name: 'Sertanejo',
    icon: Music,
    iconColor: '#F59E0B',
    iconBg: '#F59E0B26',
    trackCount: 180,
    description: '',
    artists: 'Modão ao Atual',
    layout: 'card',
  },
  {
    id: 'rock-nacional',
    name: 'Rock Nacional',
    icon: Volume2,
    iconColor: '#A855F7',
    iconBg: '#A855F726',
    trackCount: 120,
    description: '',
    artists: 'Legião, Charlie Brown',
    layout: 'card',
  },
  {
    id: 'funk-trap',
    name: 'Funk & Trap BR',
    icon: AudioLines,
    iconColor: '#EC4899',
    iconBg: '#EC489926',
    trackCount: 160,
    description: '',
    artists: 'Anitta, Matuê, Veigh',
    layout: 'card',
  },
  {
    id: 'mpb-bossa',
    name: 'MPB & Bossa Nova',
    icon: Circle,
    iconColor: '#10B981',
    iconBg: '#10B98126',
    trackCount: 110,
    description: '',
    artists: 'Caetano, Elis, Tim Maia',
    layout: 'row',
  },
];

/* ── Song ── */
export interface Song {
  title: string;
  artist: string;
  album: string;
  year: number;
  durationSec: number;
}

export const MOCK_SONGS: Song[] = [
  { title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', year: 2020, durationSec: 200 },
  { title: 'Midnight City', artist: 'M83', album: "Hurry Up, We're Dreaming", year: 2011, durationSec: 243 },
  { title: 'Lapada Dela', artist: 'Menos é Mais & Matheus Fernandes', album: 'Pagode Hits', year: 2023, durationSec: 195 },
  { title: 'Evidências', artist: 'Chitãozinho & Xororó', album: 'Clássicos', year: 1990, durationSec: 280 },
  { title: 'Pais e Filhos', artist: 'Legião Urbana', album: 'As Quatro Estações', year: 1989, durationSec: 315 },
];

/* ── Guess Entry ── */
export type GuessStatus = 'wrong' | 'current' | 'locked';

export interface GuessEntry {
  id: string;
  text: string;
  checkpoint: TimeCheckpoint;
  status: GuessStatus;
}

export const MOCK_GUESSES: GuessEntry[] = [
  { id: '1', text: 'Queen — Bohemian Rhapsody', checkpoint: 0.5, status: 'wrong' },
  { id: '2', text: 'Aguardando seu palpite...', checkpoint: 1, status: 'current' },
  { id: '3', text: '—', checkpoint: 5, status: 'locked' },
];

/* ── Duel State ── */
export interface DuelPlayer {
  initials: string;
  name: string;
  score: number;
  status: string;
  statusDetail: string;
  variant: 'you' | 'opponent';
}

export interface DuelState {
  matchId: string;
  genre: string;
  round: number;
  totalRounds: number;
  timeRemaining: number;
  players: [DuelPlayer, DuelPlayer];
  roundResults: ('you' | 'opponent' | 'draw' | null)[];
}

export const MOCK_DUEL: DuelState = {
  matchId: '#BR-4091',
  genre: 'Pagode & Samba',
  round: 3,
  totalRounds: 5,
  timeRemaining: 8,
  players: [
    {
      initials: 'VC',
      name: 'Você',
      score: 1,
      status: '✓ Enviou (0.5s)',
      statusDetail: '',
      variant: 'you',
    },
    {
      initials: 'LS',
      name: 'Lucas S.',
      score: 1,
      status: '⚡ Ouvindo...',
      statusDetail: 'Ainda tem 08s para responder',
      variant: 'opponent',
    },
  ],
  roundResults: ['you', 'opponent', null, null, null],
};

/* ── Screen Type ── */
export type ScreenType =
  | 'categories'
  | 'gameplay'
  | 'victory'
  | 'gameover'
  | 'duel';
