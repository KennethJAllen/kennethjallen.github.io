/**
 * PUCT Monte-Carlo tree search, ported from santorini-marl `santorini/az/mcts.py`.
 *
 * Nodes live in a transposition table keyed by game.key(), so the tree is
 * reused within a search and across moves of the same game (call reset()
 * between games). Values are from the perspective of the player to move and
 * negated once per ply on backup; step flips the player even on a winning
 * move, so a terminal state's value is always -1.
 *
 * No Dirichlet noise — this port is for play, not self-play training.
 *
 * Numeric parity: Python computes selection scores in float32 (priors, W are
 * float32 arrays), so intermediates here are rounded with Math.fround to
 * track it; exact bitwise parity is impossible anyway (ONNX drift) and the
 * parity test only requires argmax-visits to match with visits close in L1.
 */

import { softmaxOverLegal } from './net';
import type { AZNet } from './net';
import * as game from './game';
import type { State } from './game';

export const C_PUCT = 1.5;

class MCTSNode {
  readonly ids: number[];
  readonly P: Float32Array;
  readonly N: Int32Array;
  readonly W: Float32Array;
  readonly children: (State | null)[];

  constructor(ids: number[], priors: Float32Array) {
    this.ids = ids;
    this.P = priors;
    this.N = new Int32Array(ids.length);
    this.W = new Float32Array(ids.length);
    this.children = new Array(ids.length).fill(null);
  }
}

export class MCTS {
  private nodes = new Map<string, MCTSNode>();

  constructor(private readonly net: AZNet, private readonly cPuct: number = C_PUCT) {}

  reset(): void {
    this.nodes.clear();
  }

  /**
   * Run `sims` simulations from `state`; returns legal ids with visit
   * counts. Reports progress every ~10 sims when `onProgress` is given.
   */
  async run(
    state: State,
    sims: number,
    onProgress?: (done: number, total: number) => void,
  ): Promise<{ ids: number[]; visits: Int32Array }> {
    if (game.isTerminal(state)) throw new Error('Cannot search a terminal state');
    const root = await this.ensure(state);
    for (let i = 0; i < sims; i++) {
      await this.simulate(state, root);
      if (onProgress && (i + 1) % 10 === 0) onProgress(i + 1, sims);
    }
    return { ids: root.ids, visits: root.N.slice() };
  }

  /** Best action: argmax visits, ties broken toward the lowest action id. */
  async bestAction(state: State, sims: number, onProgress?: (done: number, total: number) => void): Promise<number> {
    const { ids, visits } = await this.run(state, sims, onProgress);
    let best = 0;
    for (let i = 1; i < visits.length; i++) {
      if (visits[i] > visits[best]) best = i;
    }
    return ids[best];
  }

  private async ensure(state: State): Promise<MCTSNode> {
    const k = game.key(state);
    const node = this.nodes.get(k);
    if (node !== undefined) return node;
    return (await this.expand(state, k)).node;
  }

  private async expand(state: State, k: string): Promise<{ node: MCTSNode; value: number }> {
    const ids = game.legalActions(state);
    const { logits, value } = await this.net.predict(state);
    const priors = softmaxOverLegal(logits, ids);
    const node = new MCTSNode(ids, priors);
    this.nodes.set(k, node);
    return { node, value };
  }

  private async simulate(state: State, root: MCTSNode): Promise<void> {
    let node = root;
    const path: Array<{ node: MCTSNode; idx: number }> = [];
    let value: number;

    for (;;) {
      const idx = this.select(node);
      path.push({ node, idx });

      let child = node.children[idx];
      if (child === null) {
        child = game.step(state, node.ids[idx]);
        node.children[idx] = child;
      }
      state = child;

      if (game.isTerminal(state)) {
        value = game.terminalValue(state);
        break;
      }
      const k = game.key(state);
      const nxt = this.nodes.get(k);
      if (nxt === undefined) {
        value = (await this.expand(state, k)).value;
        break;
      }
      node = nxt;
    }

    for (let i = path.length - 1; i >= 0; i--) {
      value = -value;
      const { node: n, idx } = path[i];
      n.N[idx] += 1;
      n.W[idx] = Math.fround(n.W[idx] + value);
    }
  }

  /**
   * PUCT selection: argmax over q + c*P*sqrt(sumN+1)/(1+N), first max wins
   * (matches np.argmax). sqrt(sumN+1) instead of sqrt(sumN) so the very
   * first simulation already follows the priors.
   */
  private select(node: MCTSNode): number {
    let sumN = 0;
    for (let i = 0; i < node.N.length; i++) sumN += node.N[i];
    const sqrtTerm = Math.sqrt(sumN + 1);

    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < node.ids.length; i++) {
      const q = node.N[i] > 0 ? Math.fround(node.W[i] / node.N[i]) : 0;
      // NumPy: c*P stays float32; the float64 sqrt scalar then promotes the
      // rest of the expression to float64 (NEP 50).
      const u = (Math.fround(this.cPuct * node.P[i]) * sqrtTerm) / (1 + node.N[i]);
      const score = q + u;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }
}
