/**
 * Web Worker owning the ONNX net and the MCTS transposition table, so
 * searches never block the UI thread.
 *
 * Messages in:  {type:'init', modelUrl} | {type:'newGame'} |
 *               {type:'search', id, state, sims}
 * Messages out: {type:'ready'} | {type:'error', message} |
 *               {type:'progress', id, done, total} |
 *               {type:'move', id, action}
 *
 * sims = 0 means raw-policy play: argmax of the masked policy logits.
 */

// The wasm-only entry: the default bundle includes WebGPU/JSEP and would
// fetch ort-wasm-simd-threaded.jsep.wasm (27 MB) instead of the plain wasm
// (13 MB) that scripts/copy-ort-wasm.mjs ships to /santorini/ort/.
import * as ort from 'onnxruntime-web/wasm';
import { AZNet } from './net';
import { MCTS } from './mcts';
import { legalActions, type State } from './game';

// GitHub Pages sends no COOP/COEP headers, so threaded wasm is unavailable;
// the net is sub-millisecond on one thread anyway.
ort.env.wasm.numThreads = 1;
// Object form on purpose: only the .wasm is fetched from public/. A string
// prefix would make ort dynamically import() the .mjs loader from /public,
// which the bundle already embeds — and Vite dev rejects such imports.
ort.env.wasm.wasmPaths = { wasm: '/santorini/ort/ort-wasm-simd-threaded.wasm' };

export interface SearchRequest {
  type: 'search';
  id: number;
  state: State;
  sims: number;
}
export type WorkerRequest =
  | { type: 'init'; modelUrl: string }
  | { type: 'newGame' }
  | SearchRequest;

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'progress'; id: number; done: number; total: number }
  | { type: 'move'; id: number; action: number };

let net: AZNet | null = null;
let mcts: MCTS | null = null;

function post(msg: WorkerResponse): void {
  (self as unknown as Worker).postMessage(msg);
}

/** postMessage clones typed arrays fine, but re-tag to be safe across serializers. */
function reviveState(s: State): State {
  return {
    heights: new Int8Array(s.heights),
    workers: new Int8Array(s.workers),
    placed: s.placed,
    player: s.player,
    winner: s.winner,
  };
}

async function search(req: SearchRequest): Promise<void> {
  if (!net || !mcts) throw new Error('worker not initialized');
  const state = reviveState(req.state);
  if (req.sims <= 0) {
    // Raw policy: argmax over legal logits (first max, i.e. lowest id on ties).
    const legal = legalActions(state);
    const { logits } = await net.predict(state);
    let best = legal[0];
    for (const a of legal) {
      if (logits[a] > logits[best]) best = a;
    }
    post({ type: 'move', id: req.id, action: best });
    return;
  }
  const action = await mcts.bestAction(state, req.sims, (done, total) =>
    post({ type: 'progress', id: req.id, done, total }),
  );
  post({ type: 'move', id: req.id, action });
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  try {
    switch (msg.type) {
      case 'init': {
        net = await AZNet.create(ort, msg.modelUrl);
        mcts = new MCTS(net);
        post({ type: 'ready' });
        break;
      }
      case 'newGame':
        mcts?.reset();
        break;
      case 'search':
        await search(msg);
        break;
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
