import { useEffect, useState } from 'react';
import { ArrowRight, Disc3, Shuffle, Timer, Trophy } from 'lucide-react';
import { api, type Profile } from '../lib/api';
export function HomeScreen({ profile, start, ranking, resume }: { profile: Profile | null; start: (name: string) => void; ranking: () => void; resume?: () => void }) {
  const [name, setName] = useState(profile?.displayName ?? '');
  const [catalog, setCatalog] = useState<{ songs: number; artists: number } | null>(null);
  useEffect(() => { let active = true; void api.catalog().then(value => { if (active) setCatalog(value); }).catch(() => {}); return () => { active = false; }; }, []);
  return <div className="screen home-screen">
    <div className="eyebrow"><span className="status-dot" /> SEU PRÓXIMO HIT ESTÁ AQUI</div>
    <h1>Reconhece só<br />pelo <span className="gradient-text">comecinho?</span></h1>
    <p className="lead">De um modão ao último refrão que grudou na cabeça. Dê o play e descubra quantas você conhece.</p>
    <div className="record-art" aria-hidden="true"><div className="record-groove"><span><Disc3 size={58} strokeWidth={1.2} /></span></div><span className="record-tag">MIX BRASIL ↗</span></div>
    <div className="feature-grid"><div><Shuffle size={20} /><strong>10 rodadas</strong><span>Uma mistura a cada partida</span></div><div><Timer size={20} /><strong>1 a 15 segundos</strong><span>Cada trecho, um desafio</span></div></div>
    {catalog && <p className="catalog-count">{catalog.songs.toLocaleString('pt-BR')} músicas · {catalog.artists} artistas no catálogo</p>}
    <form onSubmit={event => { event.preventDefault(); start(profile?.displayName ?? (name.trim() || 'Jogador')); }} className="home-form">
      {profile ? <p className="player-greeting">Pronto para mais uma, <strong>{profile.displayName}</strong>?</p> : <label className="field-label">Como podemos chamar você?<input aria-label="Seu nome" value={name} maxLength={40} placeholder="Seu nome ou apelido" onChange={event => setName(event.target.value)} /></label>}
      {resume && <button type="button" className="secondary-button" onClick={resume}>Continuar partida</button>}
      <button className="primary-button" type="submit">{resume ? 'Começar nova partida' : 'Bora jogar'}<ArrowRight size={19} /></button>
      <button className="text-button ranking-link" type="button" onClick={ranking}><Trophy size={16} /> Ver ranking</button>
    </form>
  </div>;
}
