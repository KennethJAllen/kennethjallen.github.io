/** Shared loader/types for parity_vectors.json (see src/santorini/README.md). */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface PlyRecord {
  action: number | null;
  /** Nested [x][y]. */
  heights: number[][];
  /** [player][workerId][(x,y)]. */
  workers: number[][][];
  placed: number;
  player: number;
  winner: number;
  legal: number[];
  /** 325-char '0'/'1' string, flat HWC x-major: index (x*5 + y)*13 + c. */
  obs: string;
  key: string;
  /** Net logits at the legal ids (setup swap applied); absent at terminal. */
  logits?: number[];
  value?: number;
}

export interface MCTSRecord {
  ply: number;
  sims: number;
  ids: number[];
  visits: number[];
  action: number;
}

export interface GameRecord {
  plies: PlyRecord[];
  mcts: MCTSRecord[];
}

export interface PinRecord extends PlyRecord {
  name: string;
  mcts?: MCTSRecord;
}

export interface ParityVectors {
  meta: { seed: number; num_games: number; sims: number; c_puct: number; model: string };
  games: GameRecord[];
  pins: PinRecord[];
}

let cached: ParityVectors | null = null;

export function loadVectors(): ParityVectors {
  if (!cached) {
    const path = join(dirname(fileURLToPath(import.meta.url)), 'parity_vectors.json');
    cached = JSON.parse(readFileSync(path, 'utf8')) as ParityVectors;
  }
  return cached;
}

export function modelPath(): string {
  const root = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
  return join(root, 'public', 'santorini', 'az.onnx');
}
