import type { EngineRequest, EngineResult } from './protocol';

type Pending = { resolve: (value: EngineResult) => void; reject: (reason: Error) => void; timer: number };

/**
 * Thin typed facade over the UCI worker. Only one request may own the engine
 * at a time; replacing a position first sends stop so no `go` remains orphaned.
 */
export class EngineClient {
  private worker?: Worker;
  private pending?: Pending;
  private ready = false;

  init(): Promise<void> {
    this.worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<{ type: string; result?: EngineResult; error?: string }>) => {
      if (event.data.type === 'result' && event.data.result) this.clearPending(undefined, event.data.result);
      if (event.data.type === 'error') this.clearPending(new Error(event.data.error));
    };
    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent<{ type: string; error?: string }>) => {
        if (event.data.type === 'readyok') { this.ready = true; this.worker?.removeEventListener('message', onMessage); resolve(); }
        if (event.data.type === 'error') reject(new Error(event.data.error));
      };
      this.worker?.addEventListener('message', onMessage);
      this.worker?.postMessage({ type: 'init' } satisfies EngineRequest);
    });
  }

  setStrength(skill: number, uciElo: number, movetime: number) {
    this.worker?.postMessage({ type: 'setStrength', skill, uciElo, movetime } satisfies EngineRequest);
  }

  analyze(fen: string, depth: number) { return this.request({ type: 'analyze', fen, depth }, 20_000); }
  bestMove(fen: string, movetime: number) { return this.request({ type: 'bestMove', fen, movetime }, Math.max(5_000, movetime * 4)); }

  stop() { this.worker?.postMessage({ type: 'stop' } satisfies EngineRequest); this.clearPending(new Error('Engine stopped')); }
  quit() { this.stop(); this.worker?.postMessage({ type: 'quit' } satisfies EngineRequest); this.worker?.terminate(); this.worker = undefined; this.ready = false; }

  private request(message: EngineRequest, timeout: number): Promise<EngineResult> {
    if (!this.worker || !this.ready) return Promise.reject(new Error('Engine is not ready'));
    this.stop();
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => this.clearPending(new Error('Engine timeout')), timeout);
      this.pending = { resolve, reject, timer };
      this.worker?.postMessage(message);
    });
  }

  private clearPending(error?: Error, result?: EngineResult) {
    if (!this.pending) return;
    window.clearTimeout(this.pending.timer);
    const pending = this.pending; this.pending = undefined;
    error ? pending.reject(error) : pending.resolve(result!);
  }
}
