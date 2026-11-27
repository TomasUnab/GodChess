import { create } from 'zustand';
import { applyAutopsy, calibrateRating, penalizeCct, recordGame, recordPuzzle, recordVision, useHint, type ErrorTag, type TrainingState } from '../training/model';
import { loadMyPuzzles, markAutopsy, mergePuzzles, reviewId, saveMyPuzzles, type MyPuzzle } from '../training/autopsy';
import { classifyFromEvals } from '../chess/report';
import { MIN_LEVEL, nextLevel } from '../chess/adaptiveBot';
import { addPuzzleAttempt, loadTraining, saveTraining } from '../storage/local';
import { scheduleReview } from '../training/repetition';
import { addMove, createTree, deleteNode, lineEnd, pathTo, promoteVariation, toggleNag, updateNode, type GameTree, type MoveInput } from '../chess/tree';
import { parsePgn, toPgn } from '../chess/pgn';
import { addLine, loadRepertoire, removeEntry, review, saveRepertoire, type Repertoire, type RepertoireColor } from '../chess/repertoire';

export type Area = 'home' | 'analysis' | 'games' | 'repertoire' | 'train' | 'play';
export type TrainSection = 'path' | 'lesson' | 'diagnosis' | 'puzzles' | 'blitz' | 'mistakes' | 'guess' | 'vision' | 'mates' | 'journal';
export type PlaySection = 'engine' | 'clone' | 'live' | 'invite' | 'friends';
/** A challenge handed to the invite game: host a code (challenger) or join one (opponent). */
export type PendingMatch = { role: 'host' | 'join'; code?: string; challengeId: string; opponent: string; onCode?: (code: string) => void };
export type RepertoireSection = 'mine' | 'practice' | 'tree' | 'masters' | 'explorer';
export type Theme = 'day' | 'night';
type Scan = { checks: boolean; captures: boolean; threats: boolean };

const ANALYSIS_KEY = 'godchess.analysis.v1';
const PREFS_KEY = 'godchess.prefs.v1';

export type BoardTheme = 'steel' | 'diagram' | 'wood' | 'green';
type Prefs = { boardScale?: number; focusMode?: boolean; theme: Theme; board: BoardTheme; multipv: number; engineOn: boolean; figurines: boolean; xray: boolean; playerName: string };
const defaultPrefs: Prefs = { theme: 'night', board: 'steel', multipv: 3, engineOn: true, figurines: true, xray: false, playerName: '' };
const parse = (pgn: string) => classifyFromEvals(parsePgn(pgn));
function readJson<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; } catch { return fallback; } }
function writeJson(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* blocked storage: keep state in memory */ } }

function loadAnalysis(): { tree: GameTree; current: string; gameId?: number } {
  try {
    const raw = localStorage.getItem(ANALYSIS_KEY);
    if (raw) { const saved = JSON.parse(raw); if (saved?.pgn) { const tree = parse(saved.pgn); return { tree, current: lineEnd(tree, tree.rootId), gameId: saved.gameId }; } }
  } catch { /* fall through to a fresh board */ }
  const tree = createTree();
  return { tree, current: tree.rootId };
}

type Store = {
  area: Area; train: TrainSection; playSection: PlaySection;
  match: PendingMatch | null; startMatch: (match: PendingMatch | null) => void; repertoireSection: RepertoireSection; lessonId: string;
  go: (area: Area) => void; setTrain: (section: TrainSection) => void; setPlay: (section: PlaySection) => void; setRepertoireSection: (section: RepertoireSection) => void; openLesson: (id: string) => void;
  prefs: Prefs; setPrefs: (patch: Partial<Prefs>) => void;

  // Analysis board
  tree: GameTree; current: string; orientation: 'white' | 'black'; gameId?: number; reportVersion: number;
  play: (input: MoveInput) => boolean;
  goTo: (id: string) => void; stepBack: () => void; stepForward: () => void; first: () => void; last: () => void;
  flip: () => void;
  loadGame: (pgn: string, options?: { gameId?: number; orientation?: 'white' | 'black'; at?: 'start' | 'end' }) => void;
  newBoard: (fen?: string) => void;
  setComment: (id: string, comment: string) => void; nag: (id: string, nag: number) => void;
  remove: (id: string) => void; promote: (id: string) => void;
  setHeaders: (headers: Record<string, string>) => void;
  replaceTree: (tree: GameTree) => void;
  linkGame: (gameId?: number) => void;

  // Repertoire
  repertoire: Repertoire;
  addToRepertoire: (color: RepertoireColor, opening?: string, nodeId?: string) => number;
  reviewRepertoire: (key: string, correct: boolean) => void;
  removeFromRepertoire: (key: string) => void;

  // Your own mistakes as puzzles, and the automatic post-mortem
  myPuzzles: MyPuzzle[];
  addMyPuzzles: (puzzles: MyPuzzle[]) => number;
  removeMyPuzzle: (id: string) => void;
  recordAutopsy: (key: string, causes: ErrorTag[]) => void;

  // Trainer (unchanged behaviour)
  training: TrainingState; scans: Scan; candidate: string;
  setCandidate: (candidate: string) => void; setScan: (key: keyof Scan) => void; resetScan: () => void; completeScan: () => void;
  calibrate: (correct: number) => void;
  recordPuzzleAttempt: (solved: boolean, puzzleId: string, rating: number, move?: string) => void;
  recordGameOutcome: (tag?: ErrorTag) => void;
  recordBotResult: (result: 'win' | 'draw' | 'loss') => number;
  setBotLevel: (level: number) => void; recordVisionAttempt: (correct: boolean) => void; recordCctFailure: () => void; useHint: (level: 1 | 2) => void;
};

const persistTree = (tree: GameTree, gameId?: number) => writeJson(ANALYSIS_KEY, { pgn: toPgn(tree), gameId });
const emptyScan = { checks: false, captures: false, threats: false };

export const useStore = create<Store>((set, get) => {
  const initial = loadAnalysis();
  const withTraining = (update: (state: TrainingState) => TrainingState) => set(s => { const training = update(s.training); saveTraining(training); return { training }; });
  const setTree = (tree: GameTree, current: string) => { persistTree(tree, get().gameId); set({ tree, current }); };
  return {
    area: 'home', train: 'path', playSection: 'engine',
    match: null, startMatch: match => set({ match, ...(match ? { playSection: 'invite' as PlaySection, area: 'play' as Area } : {}) }), repertoireSection: 'mine', lessonId: 'board',
    go: area => set({ area }),
    setTrain: train => set({ train, area: 'train' }),
    setPlay: playSection => set({ playSection, area: 'play' }),
    setRepertoireSection: repertoireSection => set({ repertoireSection, area: 'repertoire' }),
    openLesson: lessonId => set({ lessonId, train: 'lesson', area: 'train' }),
    prefs: (() => {
      // The departures-board world is dark first: earlier prefs move to it once.
      const saved = readJson<Prefs & { world?: number }>(PREFS_KEY, defaultPrefs);
      if (saved.world === 2) return saved;
      const moved = { ...saved, theme: 'night' as Theme, board: 'steel' as BoardTheme, world: 2 };
      writeJson(PREFS_KEY, moved);
      return moved;
    })(),
    setPrefs: patch => set(s => { const prefs = { ...s.prefs, ...patch }; writeJson(PREFS_KEY, prefs); return { prefs }; }),

    tree: initial.tree, current: initial.current, gameId: initial.gameId, orientation: 'white', reportVersion: 0,
    play: input => {
      const { tree, current } = get();
      const result = addMove(tree, current, input);
      if (!result) return false;
      setTree(result.tree, result.id);
      return true;
    },
    goTo: id => { if (get().tree.nodes[id]) set({ current: id }); },
    stepBack: () => { const { tree, current } = get(); const parent = tree.nodes[current]?.parent; if (parent) set({ current: parent }); },
    stepForward: () => { const { tree, current } = get(); const next = tree.nodes[current]?.children[0]; if (next) set({ current: next }); },
    first: () => set(s => ({ current: s.tree.rootId })),
    last: () => set(s => ({ current: lineEnd(s.tree, s.current) })),
    flip: () => set(s => ({ orientation: s.orientation === 'white' ? 'black' : 'white' })),
    loadGame: (pgn, options = {}) => {
      const tree = parse(pgn);
      const current = options.at === 'end' ? lineEnd(tree, tree.rootId) : tree.rootId;
      set({ tree, current, gameId: options.gameId, orientation: options.orientation ?? 'white', area: 'analysis', reportVersion: get().reportVersion + 1 });
      persistTree(tree, options.gameId);
    },
    newBoard: fen => { const tree = createTree(fen); set({ tree, current: tree.rootId, gameId: undefined, reportVersion: get().reportVersion + 1 }); persistTree(tree); },
    setComment: (id, comment) => setTree(updateNode(get().tree, id, { comment: comment.trim() || undefined }), get().current),
    nag: (id, nag) => setTree(toggleNag(get().tree, id, nag), get().current),
    remove: id => {
      const { tree, current } = get();
      const result = deleteNode(tree, id);
      const keepCursor = result.tree.nodes[current] && pathTo(tree, current).every(node => node !== id);
      setTree(result.tree, keepCursor ? current : result.parent);
    },
    promote: id => setTree(promoteVariation(get().tree, id), get().current),
    setHeaders: headers => setTree({ ...get().tree, headers: { ...get().tree.headers, ...headers } }, get().current),
    replaceTree: tree => setTree(tree, tree.nodes[get().current] ? get().current : tree.rootId),
    linkGame: gameId => { set({ gameId }); persistTree(get().tree, gameId); },

    repertoire: loadRepertoire(),
    addToRepertoire: (color, opening, nodeId) => {
      const { repertoire, tree, current } = get();
      const result = addLine(repertoire, tree, nodeId ?? current, color, opening);
      saveRepertoire(result.repertoire); set({ repertoire: result.repertoire });
      return result.added;
    },
    reviewRepertoire: (key, correct) => set(s => { const repertoire = review(s.repertoire, key, correct); saveRepertoire(repertoire); return { repertoire }; }),
    removeFromRepertoire: key => set(s => { const repertoire = removeEntry(s.repertoire, key); saveRepertoire(repertoire); return { repertoire }; }),

    myPuzzles: loadMyPuzzles(),
    addMyPuzzles: puzzles => {
      const { puzzles: merged, fresh } = mergePuzzles(get().myPuzzles, puzzles);
      saveMyPuzzles(merged);
      // New puzzles are due straight away in the shared spaced-repetition queue.
      withTraining(state => ({ ...state, reviews: { ...state.reviews, ...Object.fromEntries(fresh.map(puzzle => [reviewId(puzzle), { puzzleId: reviewId(puzzle), dueAt: Date.now(), intervalDays: 0, ease: 2.5, lapses: 0 }])) } }));
      set({ myPuzzles: merged });
      return fresh.length;
    },
    removeMyPuzzle: id => {
      const myPuzzles = get().myPuzzles.filter(puzzle => puzzle.id !== id);
      saveMyPuzzles(myPuzzles); set({ myPuzzles });
      withTraining(state => { const reviews = { ...state.reviews }; delete reviews[`mine-${id}`]; return { ...state, reviews }; });
    },
    recordAutopsy: (key, causes) => { markAutopsy(key); withTraining(state => applyAutopsy(state, causes)); },

    training: loadTraining(), scans: emptyScan, candidate: '',
    setCandidate: candidate => set({ candidate }),
    setScan: key => set(s => ({ scans: { ...s.scans, [key]: !s.scans[key] } })),
    resetScan: () => set({ scans: emptyScan, candidate: '' }),
    completeScan: () => set({ scans: emptyScan, candidate: '', area: 'home' }),
    calibrate: correct => withTraining(state => ({ ...state, rating: calibrateRating(correct) })),
    recordPuzzleAttempt: (solved, puzzleId, rating, move) => {
      withTraining(state => {
        const next = recordPuzzle(state, solved);
        return { ...next, reviews: { ...next.reviews, [puzzleId]: { ...scheduleReview(state.reviews[puzzleId], solved), puzzleId } } };
      });
      void addPuzzleAttempt({ puzzleId, solved, rating, move, createdAt: new Date().toISOString() }).catch(() => undefined);
    },
    recordGameOutcome: tag => withTraining(state => recordGame(state, tag)),
    setBotLevel: level => withTraining(state => ({ ...state, botLevel: Math.max(MIN_LEVEL, Math.min(2400, Math.round(level / 10) * 10)) })),
    recordBotResult: result => {
      const level = nextLevel(get().training.botLevel ?? MIN_LEVEL, result);
      withTraining(state => ({ ...state, botLevel: level, botGames: (state.botGames ?? 0) + 1 }));
      return level;
    },
    recordVisionAttempt: correct => withTraining(state => recordVision(state, correct)),
    recordCctFailure: () => withTraining(penalizeCct),
    useHint: level => withTraining(state => useHint(state, level)),
  };
});
