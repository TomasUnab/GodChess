import { useMemo, useState } from 'react';
import { NotebookPen, Puzzle } from 'lucide-react';
import { useStore } from '../../app/store';
import type { GameTree } from '../../chess/tree';
import { autopsy, autopsyRecorded, detectSide, gameKey, puzzlesFrom } from '../../training/autopsy';

/**
 * Automatic post-mortem: the player's own mistakes, each with its cause and
 * explanation, ready to file in the error profile and to drill as puzzles.
 */
export function AutopsyPanel({ tree, onSelect, onNotice }: { tree: GameTree; onSelect: (id: string) => void; onNotice: (message: string) => void }) {
  const { prefs, setPrefs, recordAutopsy, addMyPuzzles, setTrain } = useStore();
  const detected = detectSide(tree.headers, prefs.playerName);
  const [chosen, setChosen] = useState<'w' | 'b' | null>(null);
  const side = chosen ?? detected;
  const findings = useMemo(() => side ? autopsy(tree, side) : [], [tree, side]);
  const key = gameKey(tree);
  const [recorded, setRecorded] = useState(() => autopsyRecorded(key));
  const playerOf = (value: 'w' | 'b') => (value === 'w' ? tree.headers.White : tree.headers.Black) ?? '';

  const choose = (value: 'w' | 'b') => {
    setChosen(value);
    const name = playerOf(value);
    // Remember the name so the next imported game is recognised on its own.
    if (name && name !== '?' && name.toLowerCase() !== 'tú') setPrefs({ playerName: name });
  };

  const file = () => {
    recordAutopsy(key, findings.map(finding => finding.cause));
    setRecorded(true);
    onNotice(findings.length ? `Diario actualizado: ${findings.length} ${findings.length === 1 ? 'error' : 'errores'} con su causa.` : 'Partida limpia registrada en el diario.');
  };
  const drill = () => {
    const added = addMyPuzzles(puzzlesFrom(tree, findings));
    onNotice(added ? `${added} ${added === 1 ? 'puzzle nuevo' : 'puzzles nuevos'} en Entrenar → Mis errores.` : 'Estos errores ya estaban en tus puzzles.');
  };

  return (
    <section className="autopsy" aria-label="Autopsia de la partida">
      <div className="section-row">
        <h2 className="section-title">Autopsia</h2>
        <div className="seg small" role="radiogroup" aria-label="Tu color en esta partida">
          {(['w', 'b'] as const).map(value => (
            <button key={value} role="radio" aria-checked={side === value} className={side === value ? 'on' : ''} onClick={() => choose(value)}>{value === 'w' ? 'Yo: blancas' : 'Yo: negras'}</button>
          ))}
        </div>
      </div>
      {!side ? (
        <p className="muted">¿Con qué color jugabas? GodChess separa tus errores de los del rival y recuerda tu nombre para las próximas partidas.</p>
      ) : findings.length === 0 ? (
        <p className="muted">Sin errores ni errores graves tuyos según Stockfish. Las imprecisiones quedan marcadas con ?! en la notación.</p>
      ) : (
        <ol className="findings">
          {findings.map(finding => (
            <li key={finding.id}>
              <button onClick={() => onSelect(finding.id)}>
                <span className={`finding-move ${finding.node.classification}`}>{finding.label}{finding.node.classification === 'blunder' ? '??' : '?'}</span>
                <span className="finding-cause">{finding.cause}</span>
                <span className="finding-text">{finding.commentary.lines[0] ?? ''}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {side && (
        <ul className="action-list">
          <li><button onClick={file} disabled={recorded}><NotebookPen size={16} /> {recorded ? 'Ya está en tu diario' : 'Registrar las causas en mi diario'}</button></li>
          {findings.length > 0 && <li className="split"><span><Puzzle size={16} /> {findings.length} {findings.length === 1 ? 'error' : 'errores'} como puzzle</span><button className="link" onClick={drill}>crear</button><button className="link" onClick={() => setTrain('mistakes')}>ver</button></li>}
        </ul>
      )}
    </section>
  );
}
