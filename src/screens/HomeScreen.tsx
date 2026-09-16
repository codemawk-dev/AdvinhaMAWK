import { useEffect, useState } from 'react';
import { ArrowRight, Disc3, Shuffle, Timer, Trophy, Headphones, Check, Music2, CalendarDays } from 'lucide-react';
import { api, type MusicPreferences, type Profile } from '../lib/api';
export function HomeScreen({ profile, start, ranking, resume }: { profile: Profile | null; start: (name: string, preferences: MusicPreferences) => void; ranking: () => void; resume?: () => void }) {
  const currentYear = new Date().getFullYear();
  const [preferences, setPreferences] = useState<MusicPreferences>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mawk.preferences') ?? 'null');
      if (saved && Array.isArray(saved.genres) && saved.genres.every((g: unknown) => typeof g === 'string') &&
        (saved.yearFrom === null || Number.isInteger(saved.yearFrom)) && (saved.yearTo === null || Number.isInteger(saved.yearTo))) return saved;
    } catch { /* Preferences are optional. */ }
    return { genres: [], yearFrom: 2015, yearTo: currentYear };
  });
  const genres = [['sertanejo', 'Sertanejo'], ['pagode_samba', 'Pagode e samba'], ['funk', 'Funk'], ['trap_rap', 'Rap e trap'], ['pop', 'Pop'], ['axe', 'Axé'], ['forro', 'Forró'], ['mpb', 'MPB'], ['rock', 'Rock']];
  function updatePreferences(next: MusicPreferences) {
    setPreferences(next); setMatching(null); setMatchLoading(true);
    try { localStorage.setItem('mawk.preferences', JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
  }
  const [matching, setMatching] = useState<{ songs: number; titles: number; artists: number } | null>(null);
  const [matchLoading, setMatchLoading] = useState(true);
  const [matchError, setMatchError] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setMatchLoading(true); setMatchError(false);
      void api.matching(preferences).then(result => { if (active) setMatching(result); })
        .catch(() => { if (active) { setMatching(null); setMatchError(true); } })
        .finally(() => { if (active) setMatchLoading(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [preferences]);
  const [name, setName] = useState(profile?.displayName ?? '');
  const [catalog, setCatalog] = useState<{ songs: number; artists: number } | null>(null);
  useEffect(() => { let active = true; void api.catalog().then(value => { if (active) setCatalog(value); }).catch(() => {}); return () => { active = false; }; }, []);
  return <div className="screen home-screen">
    <div className="eyebrow"><span className="status-dot" /> SEU PRÓXIMO HIT ESTÁ AQUI</div>
    <h1>Reconhece só<br />pelo <span className="gradient-text">comecinho?</span></h1>
    <p className="lead">De um modão ao último refrão que grudou na cabeça. Dê o play e descubra quantas você conhece.</p>
    <div className="record-art" aria-hidden="true"><div className="record-groove"><span><Disc3 size={58} strokeWidth={1.2} /></span></div><span className="record-tag">MIX BRASIL ↗</span></div>
    <div className="feature-grid"><div><Shuffle size={20} /><strong>10 músicas</strong><span>Uma mistura a cada partida</span></div><div><Timer size={20} /><strong>0,1 a 15 segundos</strong><span>Cinco pistas por música</span></div></div>
    {catalog && <p className="catalog-count">{catalog.songs.toLocaleString('pt-BR')} músicas · {catalog.artists} artistas no catálogo</p>}
    <form onSubmit={event => { event.preventDefault(); start(profile?.displayName ?? (name.trim() || 'Jogador'), preferences); }} className="home-form">
      <fieldset className="music-preferences"><legend><Headphones size={18} aria-hidden="true" /> Seu gosto musical</legend>
        <p>Selecione os estilos que quer ouvir. Sem seleção, vale a mistura completa.</p>
        <div className="genre-options">{genres.map(([id, label]) => <label key={id}><input type="checkbox" checked={preferences.genres.includes(id!)} onChange={event => updatePreferences({ ...preferences, genres: event.target.checked ? [...preferences.genres, id!] : preferences.genres.filter(value => value !== id) })} /><span>{preferences.genres.includes(id!) ? <Check size={15} aria-hidden="true" /> : <Music2 size={15} aria-hidden="true" />}{label}</span></label>)}</div>
        <div className="year-fields"><label><CalendarDays size={15} aria-hidden="true" /> A partir de<input aria-label="Ano inicial" type="number" min={1900} max={preferences.yearTo ?? currentYear} placeholder="Qualquer ano" value={preferences.yearFrom ?? ''} onChange={event => updatePreferences({ ...preferences, yearFrom: event.target.value ? Number(event.target.value) : null })} /></label>
        <label>Até<input aria-label="Ano final" type="number" min={preferences.yearFrom ?? 1900} max={currentYear} placeholder="Qualquer ano" value={preferences.yearTo ?? ''} onChange={event => updatePreferences({ ...preferences, yearTo: event.target.value ? Number(event.target.value) : null })} /></label></div>
        <button className="text-button" type="button" onClick={() => updatePreferences({ ...preferences, yearFrom: null, yearTo: null })}>Incluir todos os anos</button>
        <p>Usamos o ano original quando conhecido; nos demais casos, o ano da edição do catálogo. Suas escolhas valem para a próxima partida.</p>
        <div className="matching-catalog" role="status" aria-live="polite"><Music2 size={18} aria-hidden="true" />
          {matchLoading ? 'Conferindo sua seleção…' : matchError ? 'Não foi possível contar agora. Você ainda pode tentar iniciar.' : matching ? matching.songs.toLocaleString('pt-BR') + ' músicas de ' + matching.artists + ' artistas combinam com você' : 'Escolha sua mistura.'}
        </div>
        {matching && matching.titles < 10 && <p role="alert">Poucas músicas nesta seleção. Inclua outro estilo ou amplie os anos para jogar 10 rodadas.</p>}
      </fieldset>
      {profile ? <p className="player-greeting">Pronto para mais uma, <strong>{profile.displayName}</strong>?</p> : <label className="field-label">Como podemos chamar você?<input aria-label="Seu nome" value={name} maxLength={40} placeholder="Seu nome ou apelido" onChange={event => setName(event.target.value)} /></label>}
      {resume && <button type="button" className="secondary-button" onClick={resume}>Continuar partida</button>}
      <button className="primary-button" type="submit" disabled={matchLoading || (matching !== null && matching.titles < 10)}>{resume ? 'Começar nova partida' : 'Bora jogar'}<ArrowRight size={19} /></button>
      <button className="text-button ranking-link" type="button" onClick={ranking}><Trophy size={16} /> Ver ranking</button>
    </form>
  </div>;
}
