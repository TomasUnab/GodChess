import { siteBase } from '../app/paths';
import type { EngineInfo, EngineMessage, EngineRequest, EngineResult } from './protocol';

type Pending = { id: number; resolve: (value: EngineResult) => void; reject: (reason: Error) => void; timer: number };
export type EngineLines = { depth: number; lines: EngineInfo[]; nps: number };

/**
 * Typed facade over the UCI worker. Every search carries an id, so a result
 * that arrives after its search was replaced is ignored instead of resolving
 * the wrong request.
 */
export class EngineClient {
  private worker?: Worker;
  private pending?: Pending;
  private ready?: Promise<void>;
  private sequence = 0;
  /** Threads the engine runs with: more than one only on cross-origin-isolated pages. */
  threads = 1;
  private streamId = 0;
  private streamLines = new Map<number, EngineInfo>();
  private onLines?: (lines: EngineLines) => void;

  init(): Promise<void> {
    if (this.ready) return this.ready;
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.ready = new Promise((resolve, reject) => {
      this.worker!.onmessage = (event: MessageEvent<EngineMessage>) => {
        const data = event.data;
        if (data.type === 'readyok') { this.threads = data.threads; resolve(); }
        if (data.type === 'error') { reject(new Error(data.error)); this.settle(this.pending?.id ?? -1, new Error(data.error)); }
        if (data.type === 'result') this.settle(data.id, undefined, data.result);
        if (data.type === 'info' && data.id === this.streamId && this.onLines) this.collect(data.info);
      };
      this.post({ type: 'init', base: siteBase() });
    });
    return this.ready;
  }

  setStrength(skill: number, uciElo: number, movetime: number) { this.post({ type: 'setStrength', skill, uciElo, movetime }); }
  fullStrength() { this.post({ type: 'fullStrength' }); }

  analyze(fen: string, depth: number) { return this.request(id => ({ type: 'analyze', id, fen, depth }), 30_000); }
  /** Several best lines at a fixed depth, in one search (result.lines, ranked). */
  analyzeMulti(fen: string, depth: number, multipv: number) { return this.request(id => ({ type: 'multi', id, fen, depth, multipv }), 30_000); }
  bestMove(fen: string, movetime: number) { return this.request(id => ({ type: 'bestMove', id, fen, movetime }), Math.max(5_000, movetime * 4)); }

  /** Infinite MultiPV analysis; `onLines` receives the lines sorted by rank as they deepen. */
  startInfinite(fen: string, multipv: number, onLines: (lines: EngineLines) => void) {
    this.settle(this.pending?.id ?? -1, new Error('Engine replaced'));
    this.streamId = ++this.sequence;
    this.streamLines.clear();
    this.onLines = onLines;
    this.post({ type: 'infinite', id: this.streamId, fen, multipv });
  }

  stop() { this.onLines = undefined; this.streamId = -1; this.post({ type: 'stop' }); this.settle(this.pending?.id ?? -1, new Error('Engine stopped')); }
  quit() { this.stop(); this.post({ type: 'quit' }); this.worker?.terminate(); this.worker = undefined; this.ready = undefined; }

  private collect(info: EngineInfo) {
    const rank = info.multipv ?? 1;
    this.streamLines.set(rank, info);
    const lines = [...this.streamLines.values()].filter(line => line.depth >= info.depth - 1).sort((a, b) => (a.multipv ?? 1) - (b.multipv ?? 1));
    this.onLines?.({ depth: Math.max(...lines.map(line => line.depth)), lines, nps: info.nps ?? 0 });
  }

  private post(message: EngineRequest) { this.worker?.postMessage(message); }

  private request(build: (id: number) => EngineRequest, timeout: number): Promise<EngineResult> {
    if (!this.worker || !this.ready) return Promise.reject(new Error('Engine is not ready'));
    this.onLines = undefined; this.streamId = -1;
    this.settle(this.pending?.id ?? -1, new Error('Engine replaced'));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => this.settle(id, new Error('Engine timeout')), timeout);
      this.pending = { id, resolve, reject, timer };
      this.post(build(id));
    });
  }

  private settle(id: number, error?: Error, result?: EngineResult) {
    if (!this.pending || this.pending.id !== id) return;
    window.clearTimeout(this.pending.timer);
    const pending = this.pending; this.pending = undefined;
    if (error) pending.reject(error); else pending.resolve(result!);
  }
}

let shared: EngineClient | null = null;
/**
 * The app's single Stockfish. Views reconfigure strength when they take it and
 * call `stop()` when they leave; the worker (and the 79 MB threaded build) stays
 * loaded, so switching tabs never reloads the engine.
 */
export function sharedEngine(): EngineClient {
  shared ??= new EngineClient();
  return shared;
}
