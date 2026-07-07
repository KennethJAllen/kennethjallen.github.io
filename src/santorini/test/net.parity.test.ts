/**
 * Net parity: run the exported ONNX model with onnxruntime-node through the
 * same AZNet wrapper the browser uses, and compare logits at the legal ids
 * and the value against the recorded PyTorch outputs (tol 1e-3).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import * as ort from 'onnxruntime-node';
import { AZNet, type OrtModule } from '../net';
import { isSetup, canonicalObs } from '../game';
import { loadVectors, modelPath, type PlyRecord } from './vectors';
import { stateFromRecord } from './helpers';

const TOL = 1e-3;
const vectors = loadVectors();

let net: AZNet;

beforeAll(async () => {
  net = await AZNet.create(ort as unknown as OrtModule, modelPath());
});

async function expectNetMatches(rec: PlyRecord, label: string): Promise<void> {
  if (!rec.logits) return; // terminal ply: no net eval recorded
  const state = stateFromRecord(rec);
  const { logits, value } = await net.predictObs(canonicalObs(state), isSetup(state));
  expect(Math.abs(value - rec.value!), `${label} value`).toBeLessThan(TOL);
  rec.legal.forEach((a, i) => {
    expect(Math.abs(logits[a] - rec.logits![i]), `${label} logit[${a}]`).toBeLessThan(TOL);
  });
}

describe('net parity: recorded playouts', () => {
  vectors.games.forEach((g, gi) => {
    it(`game ${gi}`, async () => {
      for (let pi = 0; pi < g.plies.length; pi++) {
        await expectNetMatches(g.plies[pi], `game ${gi} ply ${pi}`);
      }
    });
  });
});

describe('net parity: pin states', () => {
  for (const pin of vectors.pins) {
    it(pin.name, async () => {
      await expectNetMatches(pin, pin.name);
    });
  }
});
