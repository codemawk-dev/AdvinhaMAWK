import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { api, type Ranking, type RankingPeriod } from '../lib/api';
import { ErrorNotice, Loading } from '../components/GameShell';
export function RankingScreen({ userId }: { userId?: string }) {
  const [period, setPeriod] = useState<RankingPeriod>('daily');
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const refresh = (value: RankingPeriod) => { setRanking(null); setError(''); setPeriod(value); setRetry(value => value + 1); };
  useEffect(() => { let active = true; void api.ranking(period).then(data => { if (active) setRanking(data); }).catch(() => { if (active) setError('Não foi possível carregar o ranking.'); }); return () => { active = false; }; }, [period, retry]);
  return <div className="screen ranking-screen"><Trophy className="text-secondary" size={32} /><h1>Quem sabe, canta.</h1><p className="lead">A melhor partida de 10 rodadas de cada jogador. Horário de São Paulo.</p><div className="ranking-tabs">{([['daily', 'Hoje'], ['weekly', 'Semana'], ['all-time', 'Geral']] as const).map(([value, label]) => <button key={value} className={period === value ? 'active' : ''} aria-pressed={period === value} onClick={() => refresh(value)}>{label}</button>)}</div>
    {error ? <ErrorNotice message={error} retry={() => refresh(period)} /> : !ranking ? <Loading text="Carregando ranking…" /> : ranking.entries.length === 0 ? <p className="empty-state">O palco está livre. Termine uma partida para aparecer aqui.</p> : <ol className="ranking-list">{ranking.entries.map(entry => <li key={entry.playerId} className={entry.playerId === userId ? 'your-ranking' : ''}><span className="rank-number">{entry.position}</span><strong>{entry.displayName}{entry.playerId === userId && <small> você</small>}</strong><span>{entry.score.toLocaleString('pt-BR')}<small> pts</small></span></li>)}</ol>}
  </div>;
}
