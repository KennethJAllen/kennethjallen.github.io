/**
 * ONNX session wrapper reproducing `AZNet.predict` from santorini-marl.
 *
 * The net outputs move_logits (1600), place_logits (25) and a tanh value.
 * During SETUP the placement logits replace move logits 0..24 (placement
 * actions share those indices in the flat 1600-action space).
 *
 * The class is parameterized over the ort module so the browser (worker.ts,
 * onnxruntime-web) and the vitest parity suite (onnxruntime-node) share the
 * exact same code path.
 */

import { NUM_SPACES, OBS_CHANNELS, canonicalObs, isSetup, type State } from './game';

/** Structural subset of onnxruntime-{web,node} that AZNet needs. */
export interface OrtModule {
  Tensor: new (type: 'float32', data: Float32Array, dims: number[]) => OrtTensor;
  InferenceSession: {
    create(model: string | Uint8Array, options?: object): Promise<OrtSession>;
  };
}
export interface OrtTensor {
  data: unknown;
}
export interface OrtSession {
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
}

export interface NetOutput {
  /** 1600 combined logits (setup swap already applied). */
  logits: Float32Array;
  /** Scalar tanh value from the perspective of the player to move. */
  value: number;
}

/** Merge the placement head into the move logits for SETUP states. */
export function applySetupLogits(
  moveLogits: Float32Array,
  placeLogits: Float32Array,
  setup: boolean,
): Float32Array {
  if (!setup) return moveLogits;
  const out = moveLogits.slice();
  out.set(placeLogits.subarray(0, NUM_SPACES), 0);
  return out;
}

/**
 * Softmax over the legal entries of `logits` only, mirroring MCTS._expand:
 * float64 accumulation, result rounded to float32 (Python stores priors as
 * float32).
 */
export function softmaxOverLegal(logits: ArrayLike<number>, legal: number[]): Float32Array {
  const n = legal.length;
  const lp = new Float64Array(n);
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    lp[i] = logits[legal[i]];
    if (lp[i] > max) max = lp[i];
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    lp[i] = Math.exp(lp[i] - max);
    sum += lp[i];
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.fround(lp[i] / sum);
  return out;
}

export class AZNet {
  private constructor(
    private readonly ort: OrtModule,
    private readonly session: OrtSession,
  ) {}

  static async create(ort: OrtModule, model: string | Uint8Array): Promise<AZNet> {
    // No explicit executionProviders: onnxruntime-web defaults to wasm,
    // onnxruntime-node to cpu — both are what we want.
    const session = await ort.InferenceSession.create(model);
    return new AZNet(ort, session);
  }

  /** Single-state inference: 1600 logits (setup swap applied) + value. */
  async predictObs(obs: Float32Array, setup: boolean): Promise<NetOutput> {
    const input = new this.ort.Tensor('float32', obs, [1, OBS_CHANNELS, 5, 5]);
    const out = await this.session.run({ obs: input });
    const move = out['move_logits'].data as Float32Array;
    const place = out['place_logits'].data as Float32Array;
    const value = (out['value'].data as Float32Array)[0];
    return { logits: applySetupLogits(move, place, setup), value };
  }

  async predict(state: State): Promise<NetOutput> {
    return this.predictObs(canonicalObs(state), isSetup(state));
  }
}
