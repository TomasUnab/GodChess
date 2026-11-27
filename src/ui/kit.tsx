import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { figurine, rootPly } from '../chess/tree';
import { Flap } from './Flap';

/** Figurine SAN for an engine line starting at `fen`. */
export function figurineLine(sans: string[], fen: string) {
  const start = rootPly(fen);
  return sans.map((san, index) => {
    const ply = start + index;
    const white = ply % 2 === 0;
    const number = Math.floor(ply / 2) + 1;
    return `${white ? `${number}.` : index === 0 ? `${number}…` : ''}${figurine(san, white ? 'w' : 'b')}`;
  }).join(' ');
}

export function useToast() {
  const [message, setMessage] = useState('');
  const timer = useRef(0);
  const show = useCallback((text: string) => {
    setMessage(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(''), 4200);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { message, show };
}

export function Toast({ message }: { message: string }) {
  return <div className={`toast ${message ? 'show' : ''}`} role="status" aria-live="polite">{message}</div>;
}

/** Secondary navigation inside an area: standard tabs. */
export function SubNav<T extends string>({ items, value, onChange, label }: { items: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <nav className="subnav" aria-label={label}>
      {items.map(item => (
        <button key={item.id} className={value === item.id ? 'on' : ''} aria-current={value === item.id ? 'page' : undefined} onClick={() => onChange(item.id)}>
          {item.label}{item.count ? <span className="count">{item.count}</span> : null}
        </button>
      ))}
    </nav>
  );
}

export function PageHead({ title, lede, children }: { title: string; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'bad' | 'good' }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd className={tone}><Flap value={value} tone={tone} /></dd>
      {note && <dd className="stat-note">{note}</dd>}
    </div>
  );
}
