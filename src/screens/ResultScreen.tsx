import { useState } from 'react';
import { Check, RotateCcw, Share2, Trophy, X } from 'lucide-react';
import type { Result } from '../lib/api';
export function ResultScreen({ result, restart, ranking }: { result: Result; restart: () => void; ranking: () => void }) {
  const [shared, setShared] = useState('');
  async function share() {
    const text = `Acertei ${result.correctAnswers}/${result.totalRounds} músicas e fiz ${result.score} pontos no AdvinhaMAWK!`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); setShared('Resultado copiado!'); } }
    catch { setShared('Você pode compartilhar seu placar: ' + text); }
  }
  return <div className="screen result-screen"><div className="result-trophy"><Trophy size={36} /></div><span className="eyebrow">PARTIDA CONCLUÍDA</span><h1>Sua trilha de hoje.</h1><div className="final-score">{result.score.toLocaleString('pt-BR')}<span>pontos</span></div><div className="feature-grid"><div><strong>{result.correctAnswers}/{result.totalRounds}</strong><span>músicas certas</span></div><div><strong>{result.maxStreak}</strong><span>melhor sequência</span></div></div>
    <div className="result-list">{result.rounds.map(round => <div className="result-row" key={round.position}><span className={round.answer?.correct ? 'text-success' : 'text-danger'}>{round.answer?.correct ? <Check size={17} /> : <X size={17} />}</span><div><strong>{round.title}</strong><span>{round.artistName}{round.releaseYear ? ` · ${round.releaseYear}` : ''}</span></div><span>+{round.answer?.points ?? 0}</span></div>)}</div>
    <button className="primary-button" onClick={restart}><RotateCcw size={18} />Jogar de novo</button><button className="secondary-button" onClick={ranking}><Trophy size={17} />Ver ranking</button><button className="text-button" onClick={() => void share()}><Share2 size={17} />Compartilhar resultado</button>{shared && <p role="status" className="lead">{shared}</p>}
  </div>;
}
