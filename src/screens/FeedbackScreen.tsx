import { ArrowRight, Check, Music, X } from 'lucide-react';
import type { Answer } from '../lib/api';
export function FeedbackScreen({ answer, next, busy }: { answer: Answer; next: () => void; busy: boolean }) {
  const song = answer.correctAnswer;
  if (!song) return null;
  return <div className={`screen feedback-screen ${answer.correct ? 'correct' : 'incorrect'}`}><div className="feedback-icon">{answer.correct ? <Check size={32} /> : <X size={32} />}</div><span className="eyebrow">{answer.correct ? 'ESSA VOCÊ CONHECE!' : 'MAIS UMA PARA SUA PLAYLIST'}</span><h1>{answer.correct ? 'Acertou em cheio.' : 'Era essa aqui…'}</h1>
    <div className="revealed-song">{song.cover ? <img src={song.cover} alt={`Capa de ${song.title}`} referrerPolicy="no-referrer" /> : <div className="cover-fallback"><Music size={64} /></div>}<h2>{song.title}</h2><p>{song.artist}</p><p>{song.year ? `Ano: ${song.year}` : 'Ano não informado'}</p></div>
    <div className="score-panel"><strong>+{answer.points.toLocaleString('pt-BR')}</strong><span>pontos nesta rodada</span><p>Total: {answer.score.toLocaleString('pt-BR')} · Sequência: {answer.streak}</p></div>
    {song.appleMusicUrl && /^https:\/\//.test(song.appleMusicUrl) && <a className="text-button" href={song.appleMusicUrl} target="_blank" rel="noreferrer">Ouvir na Apple Music ↗</a>}
    <button className="primary-button" onClick={next} disabled={busy}>{busy ? 'Carregando…' : answer.completed ? 'Ver meu resultado' : 'Próxima música'}<ArrowRight size={18} /></button>
  </div>;
}
