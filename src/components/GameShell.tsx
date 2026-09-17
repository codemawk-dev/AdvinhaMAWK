import { Headphones, Home, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
export function GameShell({ children, onHome }: { children: ReactNode; onHome?: () => void }) {
  return <main className="game-shell"><header className="game-header">
    <div className="brand"><span className="brand-icon"><Headphones size={21} /></span><span>Advinha<span className="text-primary">MAWK</span></span></div>
    {onHome ? <button className="icon-button" aria-label="Voltar ao início" onClick={onHome}><Home size={19} /></button> : <span className="edition">EDIÇÃO BRASIL</span>}
  </header>{children}<footer className="game-footer">Feito para quem vive a música brasileira.</footer></main>;
}
export function Loading({ text = 'Preparando sua partida…' }: { text?: string }) {
  return <div className="loading" role="status"><LoaderCircle className="animate-spin" size={28} /><p>{text}</p></div>;
}
export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-notice" role="alert"><p>{message}</p>{retry && <button onClick={retry} className="text-button">Tentar novamente</button>}</div>;
}
