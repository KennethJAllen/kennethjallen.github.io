/**
 * TypeScript port of santorini-marl's `santorini/az/fastgame.py`.
 *
 * Parity with the Python engine is enforced by test/game.parity.test.ts
 * replaying recorded games from parity_vectors.json. Conventions carried
 * over exactly:
 *
 * - `heights` is indexed [x][y] (flat index x*5 + y); the action encoding is
 *   y-major (space index = y*5 + x); action = (y*5+x)*64 + moveDir*8 + buildDir.
 * - A move onto height 3 wins immediately and no build is applied, but the
 *   action's build part must still point at any adjacent on-board cell.
 * - Building on the square the worker just vacated is legal; the capped
 *   check runs before the own-square exemption.
 * - If the player to move has no legal action the previous player wins.
 * - `step` always flips `player`, including on a winning move, so at any
 *   terminal state the player to move is the loser. Read `winner`, never
 *   `player`, at terminal states.
 */

export const N = 5;
export const WIN_H = 3;
export const DOME = 4;
export const NUM_ACTIONS = N * N * 8 * 8; // 1600
export const NUM_SPACES = N * N; // 25; placement actions use indices 0..24
export const TOTAL_WORKERS = 4;
export const OBS_CHANNELS = 13;

/** 8 compass directions starting NW, matching santorini.utils.DIRS. */
export const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], // NW
  [0, -1], // N
  [1, -1], // NE
  [1, 0], // E
  [1, 1], // SE
  [0, 1], // S
  [-1, 1], // SW
  [-1, 0], // W
];

export interface State {
  /** 25 entries, flat index x*5 + y; 4 = dome. */
  heights: Int8Array;
  /** 8 entries: [player][workerId][(x,y)] at p*4 + i*2; -1 = unplaced. */
  workers: Int8Array;
  /** Workers placed so far; SETUP iff < 4. */
  placed: number;
  /** Player to move. */
  player: number;
  /** -1 while ongoing, else winning player id. */
  winner: number;
}

export function initialState(): State {
  return {
    heights: new Int8Array(NUM_SPACES),
    workers: new Int8Array(8).fill(-1),
    placed: 0,
    player: 0,
    winner: -1,
  };
}

export function copyState(s: State): State {
  return {
    heights: s.heights.slice(),
    workers: s.workers.slice(),
    placed: s.placed,
    player: s.player,
    winner: s.winner,
  };
}

export function isSetup(s: State): boolean {
  return s.placed < TOTAL_WORKERS;
}

export function isTerminal(s: State): boolean {
  return s.winner !== -1;
}

/** Value of a terminal state from the perspective of the player to move. */
export function terminalValue(s: State): number {
  return s.winner === s.player ? 1 : -1;
}

/** 25-entry occupancy grid indexed x*5 + y. */
function occupied(s: State): Uint8Array {
  const occ = new Uint8Array(NUM_SPACES);
  for (let w = 0; w < 4; w++) {
    const x = s.workers[w * 2];
    if (x >= 0) occ[x * N + s.workers[w * 2 + 1]] = 1;
  }
  return occ;
}

/** Sorted list of legal action ids for the player to move. */
export function legalActions(s: State): number[] {
  if (s.winner !== -1) return [];
  const occ = occupied(s);
  if (s.placed < TOTAL_WORKERS) {
    const actions: number[] = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!occ[x * N + y]) actions.push(y * N + x);
      }
    }
    return actions;
  }

  const h = s.heights;
  const actions: number[] = [];
  for (let i = 0; i < 2; i++) {
    const wx = s.workers[s.player * 4 + i * 2];
    const wy = s.workers[s.player * 4 + i * 2 + 1];
    const fromH = h[wx * N + wy];
    for (let mdir = 0; mdir < 8; mdir++) {
      const tx = wx + DIRS[mdir][0];
      const ty = wy + DIRS[mdir][1];
      if (tx < 0 || tx >= N || ty < 0 || ty >= N) continue;
      if (occ[tx * N + ty]) continue;
      const th = h[tx * N + ty];
      if (th > fromH + 1) continue;
      const base = (wy * N + wx) * 64 + mdir * 8;
      if (th === WIN_H) {
        // Winning move: build part may be any adjacent on-board cell.
        for (let bdir = 0; bdir < 8; bdir++) {
          const bx = tx + DIRS[bdir][0];
          const by = ty + DIRS[bdir][1];
          if (bx >= 0 && bx < N && by >= 0 && by < N) actions.push(base + bdir);
        }
      } else {
        for (let bdir = 0; bdir < 8; bdir++) {
          const bx = tx + DIRS[bdir][0];
          const by = ty + DIRS[bdir][1];
          if (bx < 0 || bx >= N || by < 0 || by >= N) continue;
          if (h[bx * N + by] === DOME) continue;
          if (occ[bx * N + by] && !(bx === wx && by === wy)) continue;
          actions.push(base + bdir);
        }
      }
    }
  }
  actions.sort((a, b) => a - b);
  return actions;
}

/** Early-exit existence check equivalent to `legalActions(s).length > 0`. */
function hasAnyMove(s: State): boolean {
  if (s.placed < TOTAL_WORKERS) return true; // 25 cells, at most 4 workers
  const h = s.heights;
  const occ = occupied(s);
  for (let i = 0; i < 2; i++) {
    const wx = s.workers[s.player * 4 + i * 2];
    const wy = s.workers[s.player * 4 + i * 2 + 1];
    const fromH = h[wx * N + wy];
    for (let mdir = 0; mdir < 8; mdir++) {
      const tx = wx + DIRS[mdir][0];
      const ty = wy + DIRS[mdir][1];
      if (tx < 0 || tx >= N || ty < 0 || ty >= N) continue;
      if (occ[tx * N + ty]) continue;
      const th = h[tx * N + ty];
      if (th > fromH + 1) continue;
      if (th === WIN_H) return true; // every cell has an adjacent on-board cell
      for (let bdir = 0; bdir < 8; bdir++) {
        const bx = tx + DIRS[bdir][0];
        const by = ty + DIRS[bdir][1];
        if (bx < 0 || bx >= N || by < 0 || by >= N) continue;
        if (h[bx * N + by] === DOME) continue;
        if (occ[bx * N + by] && !(bx === wx && by === wy)) continue;
        return true;
      }
    }
  }
  return false;
}

/** Apply a legal action; assumes legality (MCTS/UI only feed legal ids). */
export function step(s: State, action: number): State {
  if (s.winner !== -1) throw new Error('Cannot step a terminal state');
  const heights = s.heights.slice();
  const workers = s.workers.slice();

  if (s.placed < TOTAL_WORKERS) {
    const x = action % N;
    const y = Math.floor(action / N);
    const wi = Math.floor(s.placed / 2);
    workers[s.player * 4 + wi * 2] = x;
    workers[s.player * 4 + wi * 2 + 1] = y;
    const placed = s.placed + 1;
    const nxt = placed === TOTAL_WORKERS ? 0 : placed % 2;
    const next: State = { heights, workers, placed, player: nxt, winner: -1 };
    if (placed === TOTAL_WORKERS && !hasAnyMove(next)) next.winner = 1 - nxt;
    return next;
  }

  const fromIdx = Math.floor(action / 64);
  const rem = action % 64;
  const mdir = Math.floor(rem / 8);
  const bdir = rem % 8;
  const fx = fromIdx % N;
  const fy = Math.floor(fromIdx / N);
  const tx = fx + DIRS[mdir][0];
  const ty = fy + DIRS[mdir][1];

  const p = s.player;
  let wi: number;
  if (workers[p * 4] === fx && workers[p * 4 + 1] === fy) wi = 0;
  else if (workers[p * 4 + 2] === fx && workers[p * 4 + 3] === fy) wi = 1;
  else throw new Error(`No worker of player ${p} at (${fx},${fy})`);
  workers[p * 4 + wi * 2] = tx;
  workers[p * 4 + wi * 2 + 1] = ty;

  if (heights[tx * N + ty] === WIN_H) {
    return { heights, workers, placed: s.placed, player: 1 - p, winner: p };
  }

  const bx = tx + DIRS[bdir][0];
  const by = ty + DIRS[bdir][1];
  heights[bx * N + by] += 1;
  const next: State = { heights, workers, placed: s.placed, player: 1 - p, winner: -1 };
  if (!hasAnyMove(next)) next.winner = p;
  return next;
}

const HEX = '0123456789abcdef';

/**
 * Hex string id, canonical to the player to move (own workers first).
 * Byte-identical to Python's `fastgame.key(state).hex()`.
 */
export function key(s: State): string {
  const bytes = new Uint8Array(34);
  bytes.set(new Uint8Array(s.heights.buffer, s.heights.byteOffset, 25), 0);
  const p = s.player;
  const w = new Uint8Array(s.workers.buffer, s.workers.byteOffset, 8);
  bytes.set(w.subarray(p * 4, p * 4 + 4), 25);
  bytes.set(w.subarray((1 - p) * 4, (1 - p) * 4 + 4), 29);
  bytes[33] = s.placed;
  let out = '';
  for (let i = 0; i < 34; i++) {
    out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 15];
  }
  return out;
}

/**
 * (13,5,5) float32 observation from the player to move's perspective,
 * flattened NCHW: index ch*25 + x*5 + y (feeds ONNX with no transpose).
 *
 * Channels match Python `canonical_obs` (which is HWC): 0-4 height one-hot,
 * 5-8 per-worker planes (mine first), 9/10 any-worker planes, 11/12 threat
 * planes (empty level-3 cells adjacent to a mine/opponent worker at >= 2).
 */
export function canonicalObs(s: State): Float32Array {
  const obs = new Float32Array(OBS_CHANNELS * NUM_SPACES);
  const h = s.heights;
  for (let i = 0; i < NUM_SPACES; i++) {
    obs[h[i] * NUM_SPACES + i] = 1;
  }

  const p = s.player;
  const occ = occupied(s);
  for (let rel = 0; rel < 2; rel++) {
    const q = rel === 0 ? p : 1 - p;
    for (let i = 0; i < 2; i++) {
      const x = s.workers[q * 4 + i * 2];
      const y = s.workers[q * 4 + i * 2 + 1];
      if (x < 0) continue;
      obs[(5 + 2 * rel + i) * NUM_SPACES + x * N + y] = 1;
      obs[(9 + rel) * NUM_SPACES + x * N + y] = 1;
      if (h[x * N + y] >= WIN_H - 1) {
        for (let d = 0; d < 8; d++) {
          const tx = x + DIRS[d][0];
          const ty = y + DIRS[d][1];
          if (
            tx >= 0 && tx < N && ty >= 0 && ty < N &&
            h[tx * N + ty] === WIN_H && !occ[tx * N + ty]
          ) {
            obs[(11 + rel) * NUM_SPACES + tx * N + ty] = 1;
          }
        }
      }
    }
  }
  return obs;
}

/** Decompose a move action id into its parts (UI helper). */
export function decodeAction(action: number): {
  fx: number; fy: number; mdir: number; bdir: number;
  tx: number; ty: number; bx: number; by: number;
} {
  const fromIdx = Math.floor(action / 64);
  const rem = action % 64;
  const mdir = Math.floor(rem / 8);
  const bdir = rem % 8;
  const fx = fromIdx % N;
  const fy = Math.floor(fromIdx / N);
  const tx = fx + DIRS[mdir][0];
  const ty = fy + DIRS[mdir][1];
  return { fx, fy, mdir, bdir, tx, ty, bx: tx + DIRS[bdir][0], by: ty + DIRS[bdir][1] };
}
