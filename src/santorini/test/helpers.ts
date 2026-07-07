import { OBS_CHANNELS, N, type State } from '../game';
import type { PlyRecord } from './vectors';

/** Build a State from a recorded ply/pin. */
export function stateFromRecord(rec: PlyRecord): State {
  const heights = new Int8Array(25);
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) heights[x * N + y] = rec.heights[x][y];
  }
  const workers = new Int8Array(8);
  for (let p = 0; p < 2; p++) {
    for (let w = 0; w < 2; w++) {
      workers[p * 4 + w * 2] = rec.workers[p][w][0];
      workers[p * 4 + w * 2 + 1] = rec.workers[p][w][1];
    }
  }
  return { heights, workers, placed: rec.placed, player: rec.player, winner: rec.winner };
}

/**
 * Convert the recorded obs string (flat HWC x-major, index (x*5+y)*13+c) to
 * the NCHW layout canonicalObs emits (index c*25 + x*5 + y).
 */
export function recordObsToNCHW(obs: string): Float32Array {
  const out = new Float32Array(OBS_CHANNELS * 25);
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let c = 0; c < OBS_CHANNELS; c++) {
        out[c * 25 + x * N + y] = obs[(x * N + y) * OBS_CHANNELS + c] === '1' ? 1 : 0;
      }
    }
  }
  return out;
}
