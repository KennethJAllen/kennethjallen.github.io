/**
 * MCTS parity: rebuild each recorded search position, run a fresh-tree
 * no-noise search with the same sim count, and require:
 * - identical legal ids,
 * - the same argmax-visits action (Python ties break to the lowest id, which
 *   both sides get from first-max argmax over sorted ids),
 * - visit counts within 10% of sims in L1 (bitwise parity is impossible:
 *   ONNX logits drift ~1e-6 and selection-score float ops differ slightly),
 * - forced-win pin states: exact action match.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import * as ort from 'onnxruntime-node';
import { AZNet, type OrtModule } from '../net';
import { MCTS } from '../mcts';
import * as game from '../game';
import { loadVectors, modelPath, type MCTSRecord, type PlyRecord } from './vectors';
import { stateFromRecord } from './helpers';

const vectors = loadVectors();

let net: AZNet;

beforeAll(async () => {
  net = await AZNet.create(ort as unknown as OrtModule, modelPath());
});

async function checkSearch(state: game.State, rec: MCTSRecord, label: string): Promise<void> {
  const mcts = new MCTS(net); // fresh tree per record, like the exporter
  const { ids, visits } = await mcts.run(state, rec.sims);
  expect(ids, `${label} ids`).toEqual(rec.ids);

  let best = 0;
  let l1 = 0;
  for (let i = 0; i < visits.length; i++) {
    if (visits[i] > visits[best]) best = i;
    l1 += Math.abs(visits[i] - rec.visits[i]);
  }
  expect(ids[best], `${label} action (visits ${Array.from(visits)} vs ${rec.visits})`).toBe(
    rec.action,
  );
  expect(l1, `${label} visits L1`).toBeLessThan(rec.sims * 0.1);
}

describe('mcts parity: recorded playouts', () => {
  vectors.games.forEach((g, gi) => {
    if (g.mcts.length === 0) return;
    it(`game ${gi} (${g.mcts.length} searches)`, async () => {
      let state = game.initialState();
      let ply = 0;
      for (const rec of g.mcts) {
        while (ply < rec.ply) {
          state = game.step(state, g.plies[ply].action!);
          ply += 1;
        }
        await checkSearch(state, rec, `game ${gi} ply ${rec.ply}`);
      }
    });
  });
});

describe('mcts parity: pin states', () => {
  for (const pin of vectors.pins) {
    if (!pin.mcts) continue;
    it(pin.name, async () => {
      await checkSearch(stateFromRecord(pin), pin.mcts!, pin.name);
    });
  }
});
