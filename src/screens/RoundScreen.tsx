import { useEffect, useRef, useState } from 'react';
import { Flame, Pause, Play, Search, SkipForward, X } from 'lucide-react';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { ErrorNotice } from '../components/GameShell';
import { api, audioPath, type GameSummary, type Round, type SongSuggestion } from '../lib/api';
const seconds = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
export function RoundScreen({ round, game, submit, recover, busy }: {
  round: Round; game: GameSummary; submit: (id: string | null) => void; recover: () => void; busy: boolean;
}) {
  const player = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SongSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState(0);
  useEffect(() => {
    const audio = player.current;
    if (audio && !audio.getAttribute('src')) { audio.src = audioPath(round.previewUrl); audio.load(); }
    return () => { if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); } };
  }, [round.previewUrl]);
  useEffect(() => {
    let current = true;
    if (query.trim().length < 2 || selected) return;
    const timer = window.setTimeout(() => {
      void api.search(query.trim()).then(result => {
        if (current) { setSuggestions(result.songs); setSearching(false); }
      }).catch(() => { if (current) { setSearchError('Não foi possível buscar. Digite novamente para tentar outra vez.'); setSearching(false); } });
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [query, selected]);
  function change(value: string) {
    setQuery(value); setSelected(null); setSuggestions([]); setActive(-1); setSearchError('');
    setOpen(true); setSearching(value.trim().length >= 2);
  }
  function choose(song: SongSuggestion) { setSelected(song); setQuery(song.title + ' — ' + song.artist); setOpen(false); setActive(-1); setSearching(false); }
  async function play() {
    const audio = player.current;
    if (!audio || !ready) return;
    setAudioError('');
    if (!audio.paused) { audio.pause(); return; }
    try { audio.currentTime = 0; await audio.play(); }
    catch { setAudioError('O navegador não conseguiu iniciar o áudio. Toque em ouvir novamente ou recupere o trecho.'); }
  }
  const finish = (id: string | null) => { player.current?.pause(); submit(id); };
  const next = round.clues[round.attempt + 1];
  return <div className="screen round-screen">
    <div className="round-top"><span className="eyebrow">MÚSICA {game.currentRound + 1} / {game.totalRounds}</span><span className="streak"><Flame size={16} />{game.streak}</span></div>
    <h1>Qual é a música?</h1><p className="lead">Digite o título ou artista e selecione seu palpite.</p>
    {round.replaced && <p role="status" className="recovery-notice">Trocamos um áudio indisponível. Você continua com todas as pistas desta música, sem perder pontos.</p>}
    <div className="audio-stage">
      <button className={`record-button ${playing ? 'is-playing' : ''}`} onClick={() => void play()} disabled={busy || !ready} aria-label={playing ? 'Pausar trecho' : ready ? 'Ouvir trecho' : 'Preparando áudio'}>
        <span>{playing ? <Pause fill="currentColor" size={30} /> : <Play fill="currentColor" size={30} />}</span>
      </button>
      <AudioVisualizer isPlaying={playing} />
      <span className="clip-label">{audioError ? 'Vamos recuperar seu áudio' : !ready ? 'Preparando trecho…' : `${seconds(round.duration)} segundos liberados`}</span>
      <audio ref={player} src={audioPath(round.previewUrl)} preload="auto"
        onCanPlay={() => { setReady(true); setAudioError(''); }}
        onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={() => setPosition(Math.min(round.duration, player.current?.currentTime ?? 0))}
        onEnded={() => { setPlaying(false); setPosition(round.duration); }}
        onError={() => { setReady(false); setPlaying(false); setAudioError('Este trecho não carregou. Vamos tentar novamente; nenhuma tentativa foi descontada.'); }} />
    </div>
    {audioError && <ErrorNotice message={audioError} retry={recover} />}
    <div className="clue-timeline" role="progressbar" aria-label="Trecho liberado" aria-valuemin={0} aria-valuemax={15} aria-valuenow={round.duration}>
      <span className="unlocked" style={{ width: `${round.duration / 15 * 100}%` }} />
      <span className="played" style={{ width: `${position / 15 * 100}%` }} />
    </div>
    <ol className="clue-steps" aria-label="Progressão das pistas">{round.clues.map((duration, index) =>
      <li key={duration} aria-current={index === round.attempt ? 'step' : undefined} className={index <= round.attempt ? 'unlocked' : ''}>{seconds(duration)}s</li>)}</ol>
    <div className="round-stats"><span>Pista {round.attempt + 1} de {round.clues.length} · sem cronômetro</span><span>{game.score.toLocaleString('pt-BR')} pontos</span></div>
    {round.guesses.length > 0 && <ol className="guess-history" aria-label="Palpites anteriores">{round.guesses.map((guess, index) =>
      <li key={index}><X size={16} aria-hidden="true" /><span>{guess.title ? `${guess.title} — ${guess.artist}` : 'Pista pulada'}<small>{seconds(round.clues[index]!)}s</small></span></li>)}</ol>}
    <form className="guess-form" onSubmit={event => { event.preventDefault(); if (selected && ready && !busy) finish(selected.id); }}>
      <label htmlFor="song-search" className="field-label">Qual música você reconheceu?</label>
      <div className="song-search-wrap"><Search size={18} aria-hidden="true" />
        <input id="song-search" role="combobox" aria-label="Buscar música ou artista" aria-autocomplete="list" aria-expanded={open && query.trim().length >= 2}
          aria-controls="song-suggestions" aria-activedescendant={active >= 0 ? `suggestion-${active}` : undefined}
          autoComplete="off" maxLength={100} placeholder="Digite uma música ou artista…" value={query} disabled={busy}
          onChange={event => change(event.target.value)} onFocus={() => { if (!selected) setOpen(true); }}
          onKeyDown={event => {
            if (event.key === 'Escape') { setOpen(false); setActive(-1); }
            if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(value => Math.min(value + 1, suggestions.length - 1)); }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActive(value => Math.max(0, value - 1)); }
            if (event.key === 'Enter' && open && !selected) { event.preventDefault(); if (active >= 0 && suggestions[active]) choose(suggestions[active]); }
          }} />
      </div>
      {open && !selected && query.trim().length >= 2 && <div className="suggestion-panel">
        {searching ? <p role="status">Buscando no catálogo…</p> : searchError ? <p role="alert">{searchError}</p> : suggestions.length === 0 ? <p role="status">Nenhuma música encontrada. Tente outro título ou artista.</p> : null}
        <ul id="song-suggestions" role="listbox" aria-label="Músicas encontradas">{suggestions.map((song, index) =>
          <li id={`suggestion-${index}`} role="option" aria-selected={index === active} key={song.id}
            onMouseDown={event => event.preventDefault()} onClick={() => choose(song)}>
            <strong>{song.title}</strong><span>{song.artist}</span>
          </li>)}</ul>
      </div>}
      <button className="primary-button" type="submit" disabled={!selected || !ready || busy}>{busy ? 'Conferindo…' : 'Enviar palpite'}</button>
    </form>
    <button className="text-button" disabled={busy || !ready} onClick={() => finish(null)}><SkipForward size={16} />{next ? `Ouvir mais · liberar ${seconds(next)}s` : 'Revelar música'}</button>
    <p className="clue-help">Cada erro ou pulo libera mais da mesma música. Quanto menos ouvir, mais pontos.</p>
  </div>;
}
