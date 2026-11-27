export type ErrorTag = 'pieza colgada'|'amenaza no vista'|'mate fallado'|'cambio mal calculado'|'rey expuesto'|'apuro de tiempo'|'otro';
export type ErrorEntry = { id: string; createdAt: string; tag: ErrorTag; move?: string; fen?: string; severity: 1|2; source: 'game'|'drill' };
import type { ReviewCard } from './repetition';
export type TrainingState = { rating: number; xp: number; errors: Record<ErrorTag, number>; games: number; slowGames: number; visionAccuracy: number; mateInOne: number; puzzleAttempts: number; puzzleSolved: number; reviews: Record<string, ReviewCard>; botLevel: number; botGames: number };
export const defaultTraining: TrainingState = { rating: 800, xp: 0, errors: {'pieza colgada':0,'amenaza no vista':0,'mate fallado':0,'cambio mal calculado':0,'rey expuesto':0,'apuro de tiempo':0,'otro':0}, games:0, slowGames:0, visionAccuracy:0, mateInOne:0, puzzleAttempts:0, puzzleSolved:0, reviews:{}, botLevel:250, botGames:0 };
export function dominantError(errors: TrainingState['errors']): ErrorTag { return (Object.entries(errors).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'pieza colgada') as ErrorTag; }
export function weeklyFocus(state: TrainingState) { const tag = dominantError(state.errors); return { tag, drill: tag === 'pieza colgada' ? 'Seguridad de piezas' : tag === 'amenaza no vista' ? 'Escaneo de amenazas' : 'Táctica dirigida' }; }
export function applyGameError(state: TrainingState, tag: ErrorTag, severity: 1|2): TrainingState { return { ...state, errors: { ...state.errors, [tag]: state.errors[tag] + severity }, xp: Math.max(0, state.xp - (severity === 2 ? 20 : 10)) }; }
export function recordPuzzle(state: TrainingState, solved: boolean): TrainingState { const attempts = state.puzzleAttempts + 1; const solvedCount = state.puzzleSolved + (solved ? 1 : 0); return { ...state, puzzleAttempts: attempts, puzzleSolved: solvedCount, visionAccuracy: Math.round((solvedCount / attempts) * 100), xp: state.xp + (solved ? 10 : 0) }; }
export function recordGame(state: TrainingState, tag?: ErrorTag): TrainingState { return { ...state, games: state.games + 1, slowGames: state.slowGames + 1, errors: tag ? { ...state.errors, [tag]: state.errors[tag] + 1 } : state.errors }; }
export function recordVision(state: TrainingState, correct: boolean): TrainingState { const total = state.puzzleAttempts + state.games + 1; const current = Math.round((state.visionAccuracy * (total - 1) + (correct ? 100 : 0)) / total); return { ...state, visionAccuracy: current }; }
export function calibrateRating(correct: number, total = 6) { return Math.max(200, Math.min(1400, 800 + Math.round((correct - total / 2) * 120))); }
export function openingsUnlocked(state: TrainingState) { return state.slowGames >= 20 && state.mateInOne >= 90; }
export function penalizeCct(state: TrainingState) { return { ...state, xp: Math.max(0, state.xp - 20), errors: { ...state.errors, 'amenaza no vista': state.errors['amenaza no vista'] + 2 } }; }
export function useHint(state: TrainingState, level:1|2) { return { ...state, xp: Math.max(0, state.xp - (level===1?5:10)) }; }

/** Counts the causes found by the automatic post-mortem of one analysed game. */
export function applyAutopsy(state: TrainingState, causes: ErrorTag[]): TrainingState { const errors = { ...state.errors }; causes.forEach(tag => { errors[tag] += 1; }); return { ...state, games: state.games + 1, errors }; }
