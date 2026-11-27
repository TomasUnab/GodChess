/**
 * A figure set in split-flap cells. Each character is keyed by position and
 * value, so only the characters that change remount and turn over.
 */
export function Flap({ value, tone, label, className }: { value: string; tone?: 'bad' | 'warn' | 'good' | 'dim'; label?: string; className?: string }) {
  const chars = [...value];
  return (
    <span className={`flap ${tone ?? ''} ${className ?? ''}`} role="text" aria-label={label ?? value}>
      {chars.map((char, index) => <span key={`${index}-${char}`} className={char === ' ' ? 'gap' : 'turn'} aria-hidden="true">{char === ' ' ? '' : char}</span>)}
    </span>
  );
}
