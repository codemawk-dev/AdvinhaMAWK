import { useEffect, useRef, useState } from 'react';
import { api, ApiError, type Answer, type GameSummary, type Profile, type Result, type Round } from './lib/api';
import { ErrorNotice, GameShell, Loading } from './components/GameShell';
import { HomeScreen } from './screens/HomeScreen';
import { RoundScreen } from './screens/RoundScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { ResultScreen } from './screens/ResultScreen';
import { RankingScreen } from './screens/RankingScreen';
type Screen = 'home' | 'round' | 'feedback' | 'result' | 'ranking';
const savedGame = {
  get: () => { try { return localStorage.getItem('mawk.game'); } catch { return null; } },
  set: (id: string | null) => { try { if (id) localStorage.setItem('mawk.game', id); else localStorage.removeItem('mawk.game'); } catch { /* Storage can be disabled in private browsing. */ } },
};
export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gameId, setGameId] = useState<string | null>(savedGame.get);
  const [game, setGame] = useState<GameSummary | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    void api.profile().then(value => { if (active) setProfile(value); }).catch(error => {
      if (active && error instanceof ApiError && error.status === 401) { savedGame.set(null); setGameId(null); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function load(id: string) {
    const summary = await api.game(id);
    setGame(summary);
    if (summary.status === 'COMPLETED') {
      setResult(await api.result(id)); savedGame.set(null); setGameId(null); setScreen('result');
    } else if (summary.status === 'EXPIRED') {
      savedGame.set(null); setGameId(null); setScreen('home'); throw new Error('Essa partida expirou. Comece uma nova mistura.');
    } else { setRound(await api.round(id)); setScreen('round'); }
  }
  async function run(work: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await work(); }
    catch (error) {
      setError(error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.');
      if (error instanceof ApiError && [401, 404, 410].includes(error.status)) {
        savedGame.set(null); setGameId(null); setScreen('home'); if (error.status === 401) setProfile(null);
      }
    } finally { locked.current = false; setBusy(false); }
  }
  const start = (name: string) => void run(async () => {
    if (!profile) {
      try { setProfile(await api.profile()); }
      catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        const session = await api.session(name); setProfile({ ...session, displayName: name });
      }
    }
    const created = await api.create();
    savedGame.set(created.gameId); setGameId(created.gameId); await load(created.gameId);
  });
  const submit = (option: string | null) => void run(async () => {
    if (!gameId || !round) return;
    try { const response = await api.answer(gameId, round.roundId, option); setAnswer(response); setScreen('feedback'); }
    catch (error) {
      // A response may have been committed even when the network dropped its reply.
      if (error instanceof ApiError && (error.status === 0 || error.status === 409)) {
        await load(gameId); setError('Sincronizamos sua partida. Confira a rodada atual.');
      } else throw error;
    }
  });
  const home = () => { if (!busy) { setScreen('home'); setError(''); } };
  return <GameShell onHome={screen === 'home' ? undefined : home}>
    {error && <div className="screen-error"><ErrorNotice message={error} /></div>}
    {loading || (busy && screen === 'home') ? <Loading /> : <>
      {screen === 'home' && <HomeScreen profile={profile} start={start} ranking={() => setScreen('ranking')} resume={gameId ? () => void run(() => load(gameId)) : undefined} />}
      {screen === 'round' && game && round && <RoundScreen key={round.roundId} game={game} round={round} submit={submit} busy={busy} />}
      {screen === 'feedback' && answer && <FeedbackScreen answer={answer} busy={busy} next={() => void run(async () => { if (gameId) await load(gameId); })} />}
      {screen === 'result' && result && <ResultScreen result={result} restart={() => start(profile?.displayName ?? 'Jogador')} ranking={() => setScreen('ranking')} />}
      {screen === 'ranking' && <RankingScreen userId={profile?.userId} />}
    </>}
  </GameShell>;
}
