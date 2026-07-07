/**
 * Engine parity: replay every recorded game through the TS `step` and check
 * every ply's state fields, legal actions, observation, and key against the
 * Python-generated vectors. Catches any x/y transposition immediately.
 */

import { describe, expect, it } from 'vitest';
import * as game from '../game';
import type { State } from '../game';
import { loadVectors, type PlyRecord } from './vectors';
import { recordObsToNCHW, stateFromRecord } from './helpers';

const vectors = loadVectors();

function expectStateMatches(state: State, rec: PlyRecord, label: string): void {
  const expected = stateFromRecord(rec);
  expect(Array.from(state.heights), `${label} heights`).toEqual(Array.from(expected.heights));
  expect(Array.from(state.workers), `${label} workers`).toEqual(Array.from(expected.workers));
  expect(state.placed, `${label} placed`).toBe(rec.placed);
  expect(state.player, `${label} player`).toBe(rec.player);
  expect(state.winner, `${label} winner`).toBe(rec.winner);
  expect(game.legalActions(state), `${label} legal`).toEqual(rec.legal);
  expect(game.key(state), `${label} key`).toBe(rec.key);
  expect(Array.from(game.canonicalObs(state)), `${label} obs`).toEqual(
    Array.from(recordObsToNCHW(rec.obs)),
  );
}

describe('game parity: recorded playouts', () => {
  vectors.games.forEach((g, gi) => {
    it(`game ${gi} (${g.plies.length} plies)`, () => {
      let state = game.initialState();
      g.plies.forEach((ply, pi) => {
        expectStateMatches(state, ply, `game ${gi} ply ${pi}`);
        if (ply.action !== null) {
          state = game.step(state, ply.action);
        } else {
          expect(game.isTerminal(state)).toBe(true);
          expect(game.terminalValue(state)).toBe(-1); // player to move lost
        }
      });
    });
  });
});

describe('game parity: pin states', () => {
  for (const pin of vectors.pins) {
    it(pin.name, () => {
      const state = stateFromRecord(pin);
      expect(game.legalActions(state), 'legal').toEqual(pin.legal);
      expect(game.key(state), 'key').toBe(pin.key);
      expect(Array.from(game.canonicalObs(state)), 'obs').toEqual(
        Array.from(recordObsToNCHW(pin.obs)),
      );
    });
  }
});
