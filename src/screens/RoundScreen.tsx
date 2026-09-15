import { useEffect, useRef, useState } from 'react';
import { Flame, Pause, Play, SkipForward } from 'lucide-react';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { ErrorNotice } from '../components/GameShell';
import { audioPath, type GameSummary, type Round } from '../lib/api';
export function RoundScreen({ round, game, submit, busy }: { round: Round; game: GameSummary; submit: (id: string | null) => void; busy: boolean }) {
  const player = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((Date.parse(round.deadline) - Date.now()) / 1000)));
  useEffect(() => { const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((Date.parse(round.deadline) - Date.now()) / 1000))), 250); return () => clearInterval(timer); }, [round.deadline]);
  async function play() {
    const audio = player.current;
    if (!audio) return;
    setAudioError('');
    if (!audio.paused) { audio.pause(); return; }
    setAudioBusy(true);
    try {
      if (!audio.getAttribute('src') || audio.error) { audio.src = audioPath(round.previewUrl); audio.load(); }
      audio.currentTime = 0; await audio.play();
    } catch { setAudioError('Não conseguimos tocar o trecho. Tente novamente ou pule esta rodada.'); }
    finally { setAudioBusy(false); }
  }
  const finish = (id: string | null) => { player.current?.pause(); submit(id); };
  return <div className="screen round-screen">
    <div className="round-top"><span className="eyebrow">RODADA {game.currentRound + 1} / {game.totalRounds}</span><span className="streak"><Flame size={16} />{game.streak}</span></div>
    <div className="round-progress" role="progressbar" aria-label="Progresso da partida" aria-valuemin={0} aria-valuemax={game.totalRounds} aria-valuenow={game.currentRound}><span style={{ width: `${game.currentRound / game.totalRounds * 100}%` }} /></div>
    <h1>Qual é a música?</h1><p className="lead">Ouça o trecho e escolha uma das alternativas.</p>
    <div className="audio-stage"><button className={`record-button ${playing ? 'is-playing' : ''}`} onClick={() => void play()} disabled={busy || audioBusy || remaining === 0} aria-label={playing ? 'Pausar trecho' : audioBusy ? 'Carregando áudio' : 'Ouvir trecho'}><span>{playing ? <Pause fill="currentColor" size={30} /> : <Play fill="currentColor" size={30} />}</span></button><AudioVisualizer isPlaying={playing} /><span className="clip-label">{audioBusy ? 'Carregando trecho…' : `${round.duration} segundos de música`}</span>
      <audio ref={player} preload="none" onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setAudioBusy(false); setAudioError('Áudio indisponível. Tente novamente ou pule a rodada.'); }} />
    </div>
    {audioError && <ErrorNotice message={audioError} />}
    <div className="round-stats"><span className={remaining <= 10 ? 'time-warning' : ''}>{remaining ? `${remaining}s para responder` : 'Tempo esgotado'}</span><span>{game.score.toLocaleString('pt-BR')} pontos</span></div>
    <fieldset className="option-list" disabled={busy || remaining === 0}><legend className="sr-only">Escolha a música</legend>{round.options.map((option, index) => <label key={option.id} className={`option ${selected === option.id ? 'selected' : ''}`}><input type="radio" name="answer" value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} /><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option.title}</span></label>)}</fieldset>
    <button className="primary-button" disabled={busy || (remaining > 0 && !selected)} onClick={() => finish(remaining ? selected : null)}>{busy ? 'Conferindo…' : remaining ? 'Confirmar resposta' : 'Continuar após o tempo esgotado'}</button>
    {remaining > 0 && <button className="text-button" disabled={busy} onClick={() => finish(null)}><SkipForward size={16} /> Pular rodada</button>}
  </div>;
}
