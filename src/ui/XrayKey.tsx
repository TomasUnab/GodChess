import { xraySummary } from '../chess/tactics';

/** The overlay's key, set like a diagram footnote: what each ring means in this position. */
export function XrayKey({ fen, perspective }: { fen: string; perspective: 'w' | 'b' }) {
  const { danger, targets } = xraySummary(fen, perspective);
  const side = perspective === 'w' ? 'blancas' : 'negras';
  return (
    <p className="xray-key" role="note" aria-label="Leyenda de Rayos X">
      <span><i className="hang" />{danger.some(d => d.hanging) ? `Colgadas (${side}): ${danger.filter(d => d.hanging).map(d => d.text).join(', ')}` : `Ninguna pieza de ${side} colgada`}</span>
      {danger.some(d => !d.hanging) && <span><i className="weak" />Poco defendidas: {danger.filter(d => !d.hanging).map(d => d.text).join(', ')}</span>}
      <span><i className="target" />{targets.length ? `Se puede ganar: ${targets.join(', ')}` : 'Nada que ganar del rival'}</span>
    </p>
  );
}
