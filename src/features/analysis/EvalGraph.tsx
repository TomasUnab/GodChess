import type { GameReport } from '../../chess/report';
import type { GameTree } from '../../chess/tree';

type Props = { report: GameReport; tree: GameTree; current: string; onSelect: (id: string) => void };

/** White's winning chances over the main line; the filled area is White's share, as in a printed chart. */
export function EvalGraph({ report, tree, current, onSelect }: Props) {
  const points = report.points;
  if (points.length < 2) return null;
  const width = 600; const height = 120;
  const first = points[0].ply; const last = points[points.length - 1].ply;
  const x = (ply: number) => ((ply - first) / Math.max(1, last - first)) * width;
  const y = (win: number) => height - (win / 100) * height;
  const line = points.map(point => `${x(point.ply).toFixed(1)},${y(point.win).toFixed(1)}`).join(' L');
  const area = `M0,${height} L${line} L${width},${height} Z`;
  const currentPly = tree.nodes[current]?.ply;
  const marks = points.filter(point => point.classification === 'blunder' || point.classification === 'mistake');
  return (
    <figure className="eval-graph">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Gráfica de evaluación de la partida">
        <rect width={width} height={height} className="eg-black" />
        <path d={area} className="eg-white" />
        <line x1="0" x2={width} y1={height / 2} y2={height / 2} className="eg-mid" />
        {currentPly !== undefined && currentPly >= first && currentPly <= last && <line x1={x(currentPly)} x2={x(currentPly)} y1="0" y2={height} className="eg-cursor" />}
        {points.map((point, index) => {
          const next = points[index + 1];
          const span = next ? x(next.ply) - x(point.ply) : width - x(point.ply);
          return <rect key={point.id} x={x(point.ply) - span / 2} width={Math.max(span, 2)} y="0" height={height} className="eg-hit" onClick={() => onSelect(point.id)}><title>{`Jugada ${Math.ceil(point.ply / 2)}`}</title></rect>;
        })}
      </svg>
      <div className="eg-marks" aria-hidden="true">
        {marks.map(point => <span key={point.id} className={`eg-mark ${point.classification}`} style={{ left: `${(x(point.ply) / width) * 100}%`, top: `${(y(point.win) / height) * 100}%` }} />)}
      </div>
    </figure>
  );
}
