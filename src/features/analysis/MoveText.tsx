import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { figurine, isWhiteMove, moveNumber, NAG_SYMBOLS, type GameTree, type MoveNode } from '../../chess/tree';

type Props = { tree: GameTree; current: string; onSelect: (id: string) => void; figurines: boolean };

/**
 * The game typeset as a chess column: the main line in bold, the first level
 * of variations as indented paragraphs in parentheses, deeper ones inline.
 */
export function MoveText({ tree, current, onSelect, figurines }: Props) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Scroll only the notation column, never the page: keeps the board in view.
    const box = host.current;
    const active = box?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!box || !active || box.scrollHeight <= box.clientHeight) return;
    const top = active.offsetTop; // .movetext is the offsetParent (position: relative)
    if (top < box.scrollTop) box.scrollTop = top - 8;
    else if (top + active.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + active.offsetHeight - box.clientHeight + 8;
  }, [current]);

  const label = (node: MoveNode) => figurines ? figurine(node.san, isWhiteMove(node) ? 'w' : 'b') : node.san;

  const move = (id: string, showNumber: boolean, depth: number) => {
    const node = tree.nodes[id];
    const white = isWhiteMove(node);
    const moveNags = node.nags.filter(nag => nag >= 1 && nag <= 6).map(nag => NAG_SYMBOLS[nag]).join('');
    const posNags = node.nags.filter(nag => nag > 6).map(nag => NAG_SYMBOLS[nag]).filter(Boolean).join(' ');
    // Colour follows the glyph: ?? red, ? amber, ?! only its symbol.
    const tone = node.nags.includes(4) || (node.classification === 'blunder' && !node.nags.includes(2)) ? 'bad' : node.nags.includes(2) || node.classification === 'mistake' ? 'mistake' : node.nags.includes(1) || node.nags.includes(3) ? 'strong' : '';
    return (
      <Fragment key={id}>
        <button type="button" tabIndex={-1} className={`mv ${depth === 0 ? 'main' : ''} ${tone}`} aria-current={id === current ? 'true' : undefined} onClick={() => onSelect(id)}>
          {white ? <span className="num">{moveNumber(node)}.</span> : showNumber ? <span className="num">{moveNumber(node)}…</span> : null}
          {label(node)}{moveNags && <span className="nag">{moveNags}</span>}
        </button>
        {posNags && <span className="nag pos">{posNags}</span>}
        {node.comment && <span className="comment">{node.comment}</span>}
      </Fragment>
    );
  };

  /** Renders the continuation after `parentId`. */
  const line = (parentId: string, depth: number, forceNumber: boolean, out: ReactNode[]) => {
    let parent = tree.nodes[parentId];
    let force = forceNumber;
    while (parent.children.length) {
      const [main, ...variations] = parent.children;
      out.push(move(main, force, depth));
      force = Boolean(tree.nodes[main].comment);
      if (variations.length) {
        if (depth === 0) {
          variations.forEach(variation => {
            const inner: ReactNode[] = [move(variation, true, 1)];
            line(variation, 1, false, inner);
            out.push(<div className="variation" key={`v-${variation}`}>({inner})</div>);
          });
        } else {
          variations.forEach(variation => {
            const inner: ReactNode[] = [move(variation, true, depth + 1)];
            line(variation, depth + 1, false, inner);
            out.push(<span className="sub" key={`v-${variation}`}>({inner}) </span>);
          });
        }
        force = true;
      }
      parent = tree.nodes[main];
    }
  };

  const nodes: ReactNode[] = [];
  const root = tree.nodes[tree.rootId];
  if (root.comment) nodes.push(<span className="comment" key="root-comment">{root.comment}</span>);
  line(tree.rootId, 0, true, nodes);
  const result = tree.headers.Result && tree.headers.Result !== '*' ? tree.headers.Result.replace('1/2-1/2', '½–½').replace('-', '–') : null;

  return (
    <div className="movetext" ref={host} aria-label="Notación de la partida">
      {nodes.length ? nodes : <p className="empty-note">Mueve una pieza en el tablero o importa un PGN. Cada jugada se escribe aquí, y las alternativas que pruebes quedan como variantes.</p>}
      {result && <span className="result">{result}</span>}
    </div>
  );
}
