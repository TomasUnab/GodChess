import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, FileUp, Search, Trash2 } from 'lucide-react';
import { useStore } from '../../app/store';
import { catalogNumber, deleteGame, deleteGames, importPgn, listGames, migrateLegacyGames, type StoredGame } from '../../storage/games';
import { PageHead, SubNav, Toast, useToast } from '../../ui/kit';
import { StatsView } from './StatsView';
import { OnlineImport } from '../play/OnlineImport';

type SortKey = 'id' | 'white' | 'black' | 'date' | 'plies' | 'eco';
const SOURCE_LABEL: Record<StoredGame['source'], string> = { import: 'Importada', engine: 'Contra el motor', p2p: 'P2P', analysis: 'Análisis' };
const PAGE = 50;

export function GamesView() {
  const [tab, setTab] = useState<'base' | 'stats'>('base');
  return (
    <div className="page games">
      <PageHead title="Partidas" lede="Tu base de partidas local y lo que dicen de ti. Importa archivos PGN de Lichess, Chess.com o de tu club, y abre cualquiera en el tablero de análisis." />
      <SubNav label="Partidas" value={tab} onChange={setTab} items={[{ id: 'base', label: 'Base de partidas' }, { id: 'stats', label: 'Tus estadísticas' }]} />
      {tab === 'base' ? <GamesBase /> : <StatsView />}
    </div>
  );
}

function GamesBase() {
  const [games, setGames] = useState<StoredGame[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('all');
  const [source, setSource] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'id', dir: -1 });
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const loadGame = useStore(s => s.loadGame);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState<{ ids: number[]; label: string } | null>(null);

  const refresh = () => listGames().then(rows => { setGames(rows); setFailed(false); }).catch(() => { setGames([]); setFailed(true); });
  useEffect(() => { void migrateLegacyGames().finally(refresh); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (games ?? []).filter(game =>
      (!q || `${game.white} ${game.black} ${game.event} ${game.eco ?? ''} ${game.opening ?? ''} ${game.date}`.toLowerCase().includes(q)) &&
      (result === 'all' || game.result === result) && (source === 'all' || game.source === source));
    const value = (game: StoredGame) => sort.key === 'id' ? game.id ?? 0 : sort.key === 'plies' ? game.plies : (game[sort.key] ?? '').toString().toLowerCase();
    return rows.sort((a, b) => (value(a) > value(b) ? 1 : value(a) < value(b) ? -1 : 0) * sort.dir);
  }, [games, query, result, source, sort]);
  useEffect(() => setPage(0), [query, result, source]);

  const importText = async (text: string, name = 'archivo') => {
    setBusy(true);
    try {
      const { stored, issues } = await importPgn(text);
      await refresh();
      toast.show(stored ? `${stored} ${stored === 1 ? 'partida importada' : 'partidas importadas'} de ${name}${issues.length ? ` · ${issues.length} jugadas ilegibles omitidas` : ''}.` : `No se encontró ninguna partida en ${name}.`);
    } catch { toast.show('No se pudo guardar en este navegador. Comprueba que no estés en modo privado.'); }
    finally { setBusy(false); }
  };
  const importFiles = async (files: FileList | null) => { for (const chosen of Array.from(files ?? [])) await importText(await chosen.text(), chosen.name); };

  const removeMany = async (ids: number[]) => {
    await deleteGames(ids).catch(() => undefined);
    setSelected(new Set()); setConfirm(null);
    await refresh();
    toast.show(`${ids.length} ${ids.length === 1 ? 'partida eliminada' : 'partidas eliminadas'}.`);
  };
  const toggle = (id: number) => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allFiltered = filtered.length > 0 && filtered.every(game => game.id !== undefined && selected.has(game.id));
  const imported = (games ?? []).filter(game => game.source === 'import' && game.id !== undefined);
  const remove = async (game: StoredGame) => {
    if (!game.id) return;
    await deleteGame(game.id).catch(() => undefined);
    await refresh();
    toast.show(`Partida ${catalogNumber(game.id)} eliminada.`);
  };

  const header = (key: SortKey, label: string, className = '') => (
    <th className={className} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => setSort(current => ({ key, dir: current.key === key ? (current.dir === 1 ? -1 : 1) : key === 'id' || key === 'date' ? -1 : 1 }))}>
        {label}{sort.key === key && (sort.dir === 1 ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
      </button>
    </th>
  );

  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  return (
    <div className={`games-base ${dragging ? 'dragging' : ''}`}
      onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragging(true); } }}
      onDragLeave={event => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={event => { event.preventDefault(); setDragging(false); void importFiles(event.dataTransfer.files); }}>
      <details className="online-details"><summary>Importar desde Lichess o Chess.com por nombre de usuario</summary><OnlineImport onReady={() => void refresh()} /></details>
      <div className="base-actions">
        <button className="primary" onClick={() => file.current?.click()} disabled={busy}><FileUp size={18} /> {busy ? 'Importando…' : 'Importar PGN'}</button>
        <input ref={file} type="file" accept=".pgn,.txt,application/x-chess-pgn" multiple hidden onChange={event => { void importFiles(event.target.files); event.target.value = ''; }} />
      </div>

      <div className="filters" role="search">
        <label className="search"><Search size={16} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar jugador, evento, ECO o fecha" aria-label="Buscar partidas" /></label>
        <select value={result} onChange={event => setResult(event.target.value)} aria-label="Filtrar por resultado">
          <option value="all">Todos los resultados</option><option value="1-0">Ganan blancas (1–0)</option><option value="0-1">Ganan negras (0–1)</option><option value="1/2-1/2">Tablas (½–½)</option><option value="*">Sin terminar</option>
        </select>
        <select value={source} onChange={event => setSource(event.target.value)} aria-label="Filtrar por origen">
          <option value="all">Todos los orígenes</option>{Object.entries(SOURCE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <span className="filter-count">{games ? `${filtered.length.toLocaleString('es')} de ${games.length.toLocaleString('es')}` : 'Cargando…'}</span>
      </div>

      {(selected.size > 0 || imported.length > 0) && !confirm && (
        <div className="bulk-bar" role="toolbar" aria-label="Acciones sobre varias partidas">
          {selected.size > 0 ? <>
            <span><b>{selected.size}</b> {selected.size === 1 ? 'seleccionada' : 'seleccionadas'}</span>
            <button className="secondary danger-outline" onClick={() => setConfirm({ ids: [...selected], label: `${selected.size} ${selected.size === 1 ? 'partida seleccionada' : 'partidas seleccionadas'}` })}><Trash2 size={15} /> Eliminar</button>
            <button className="link" onClick={() => setSelected(new Set())}>Quitar selección</button>
          </> : <button className="link" onClick={() => setConfirm({ ids: imported.map(game => game.id!), label: `todas las partidas importadas (${imported.length})` })}>Eliminar todas las importadas ({imported.length})</button>}
        </div>
      )}
      {confirm && (
        <div className="bulk-bar confirm" role="alertdialog" aria-label="Confirmar eliminación">
          <span>¿Eliminar {confirm.label}? No se puede deshacer. Tus estadísticas y tu doble dejarán de contarlas cuando vuelvas a entrenarlo.</span>
          <button className="primary danger-fill" onClick={() => void removeMany(confirm.ids)}>Sí, eliminar</button>
          <button className="ghost" onClick={() => setConfirm(null)}>Cancelar</button>
        </div>
      )}
      {failed && <p className="form-error" role="alert">Este navegador no permite IndexedDB (¿modo privado?). Puedes seguir analizando partidas, pero no guardarlas.</p>}

      {games && games.length === 0 && !failed ? (
        <div className="empty">
          <h2>Todavía no hay partidas</h2>
          <p>Arrastra aquí un archivo <code>.pgn</code> o usa <strong>Importar PGN</strong>. En Lichess lo descargas desde tu perfil → Exportar partidas; en Chess.com, desde Archivo de partidas. Las partidas que juegues contra el motor o por invitación se guardan aquí solas.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="games-table">
            <thead>
              <tr>
                <th className="check-col"><input type="checkbox" checked={allFiltered} aria-label={allFiltered ? 'Quitar la selección' : `Seleccionar las ${filtered.length} partidas filtradas`} title="Seleccionar todas las partidas filtradas (no solo esta página)" onChange={() => setSelected(allFiltered ? new Set() : new Set(filtered.map(game => game.id!).filter(id => id !== undefined)))} /></th>
                {header('id', 'Nº', 'num')}
                {header('white', 'Blancas')}
                {header('black', 'Negras')}
                <th>Res.</th>
                {header('date', 'Fecha')}
                {header('eco', 'ECO')}
                <th>Evento</th>
                {header('plies', 'Jug.', 'num')}
                <th className="num">Precisión</th>
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {!games && Array.from({ length: 6 }, (_, index) => <tr key={index} className="skeleton-row"><td colSpan={11}><span /></td></tr>)}
              {rows.map(game => (
                <tr key={game.id} className={game.id !== undefined && selected.has(game.id) ? 'selected' : ''} onDoubleClick={() => loadGame(game.pgn, { gameId: game.id, at: 'start' })}>
                  <td className="check-col"><input type="checkbox" checked={game.id !== undefined && selected.has(game.id)} onChange={() => game.id !== undefined && toggle(game.id)} aria-label={`Seleccionar partida ${catalogNumber(game.id)}`} /></td>
                  <td className="num cat">{String(game.id).padStart(4, '0')}</td>
                  <td><button className="cell-link" onClick={() => loadGame(game.pgn, { gameId: game.id, at: 'start' })}>{game.white}</button>{game.whiteElo && <small> {game.whiteElo}</small>}</td>
                  <td>{game.black}{game.blackElo && <small> {game.blackElo}</small>}</td>
                  <td className="res">{game.result.replace('1/2-1/2', '½–½').replace('-', '–')}</td>
                  <td className="date">{game.date.replace(/\./g, '/')}</td>
                  <td title={game.opening}>{game.eco ?? '—'}</td>
                  <td className="event">{game.event || SOURCE_LABEL[game.source]}</td>
                  <td className="num">{Math.ceil(game.plies / 2)}</td>
                  <td className="num">{game.accuracy ? `${game.accuracy[0].toFixed(0)} · ${game.accuracy[1].toFixed(0)}` : '—'}</td>
                  <td className="row-actions"><button className="icon danger" onClick={() => void remove(game)} aria-label={`Eliminar partida ${catalogNumber(game.id)}`} title="Eliminar"><Trash2 size={15} /></button></td>
                </tr>
              ))}
              {games && games.length > 0 && !filtered.length && <tr><td colSpan={11} className="no-match">Ninguna partida coincide con «{query}». Prueba con el apellido del jugador o el código ECO.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="pager">
          <button className="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anteriores</button>
          <span>Página {page + 1} de {pages}</span>
          <button className="secondary" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Siguientes</button>
        </div>
      )}
      {dragging && <div className="drop-hint" aria-hidden="true">Suelta el archivo PGN para importarlo</div>}
      <Toast message={toast.message} />
    </div>
  );
}
