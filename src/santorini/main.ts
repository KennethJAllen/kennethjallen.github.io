/**
 * Entry point: wires game state + history, the board UI, the AI worker, and
 * the controls (difficulty, seat, new game, undo).
 */

import * as game from './game';
import type { State } from './game';
import { BoardUI } from './ui';
import type { WorkerRequest, WorkerResponse } from './worker';

const DIFFICULTIES: Record<string, number> = { instant: 0, casual: 50, strong: 200 };

interface Elements {
  board: HTMLElement;
  status: HTMLElement;
  difficulty: HTMLSelectElement;
  seat: HTMLSelectElement;
  newGame: HTMLButtonElement;
  undo: HTMLButtonElement;
}

function getElements(root: HTMLElement): Elements {
  const q = <T extends HTMLElement>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`missing element ${sel}`);
    return el;
  };
  return {
    board: q('.sant-board-mount'),
    status: q('.sant-status'),
    difficulty: q('.sant-difficulty'),
    seat: q('.sant-seat'),
    newGame: q('.sant-new-game'),
    undo: q('.sant-undo'),
  };
}

export function mount(root: HTMLElement): void {
  const els = getElements(root);

  let history: State[] = [game.initialState()];
  let humanPlayer = 0;
  let workerReady = false;
  let thinking = false;
  let searchId = 0;

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const send = (msg: WorkerRequest) => worker.postMessage(msg);

  const ui = new BoardUI(els.board, {
    onAction: (action) => {
      if (thinking) return;
      applyAction(action);
    },
  });

  function current(): State {
    return history[history.length - 1];
  }

  function humanTurn(): boolean {
    const s = current();
    return !game.isTerminal(s) && s.player === humanPlayer;
  }

  function setStatus(text: string): void {
    els.status.textContent = text;
  }

  function statusText(): string {
    const s = current();
    if (game.isTerminal(s)) {
      return s.winner === humanPlayer ? 'You win! 🎉' : 'The AI wins.';
    }
    if (s.player !== humanPlayer) return 'AI is thinking…';
    if (game.isSetup(s)) {
      return `Place your ${s.placed < 2 ? 'first' : 'second'} builder (${s.placed}/4 placed).`;
    }
    return 'Your move: select a builder, move, then build.';
  }

  function refresh(): void {
    const s = current();
    const p0 = root.querySelector('.sant-legend-p0');
    const p1 = root.querySelector('.sant-legend-p1');
    if (p0 && p1) {
      p0.textContent = humanPlayer === 0 ? 'You' : 'AI';
      p1.textContent = humanPlayer === 0 ? 'AI' : 'You';
    }
    ui.setPosition(s, game.legalActions(s), humanTurn() && !thinking && workerReady);
    els.undo.disabled =
      thinking || !history.some((st, i) => i < history.length - 1 && st.player === humanPlayer);
    setStatus(workerReady ? statusText() : 'Loading model…');
  }

  function applyAction(action: number): void {
    history.push(game.step(current(), action));
    refresh();
    maybeRequestAI();
  }

  function maybeRequestAI(): void {
    const s = current();
    if (!workerReady || game.isTerminal(s) || s.player === humanPlayer) return;
    thinking = true;
    searchId += 1;
    send({ type: 'search', id: searchId, state: s, sims: DIFFICULTIES[els.difficulty.value] ?? 50 });
    refresh();
  }

  function newGame(): void {
    history = [game.initialState()];
    humanPlayer = els.seat.value === 'second' ? 1 : 0;
    thinking = false;
    searchId += 1; // invalidate any in-flight search result
    send({ type: 'newGame' });
    refresh();
    maybeRequestAI();
  }

  function undo(): void {
    if (thinking) return;
    searchId += 1; // drop any stale search
    // Pop until it's the human's turn at a non-terminal state.
    while (history.length > 1) {
      history.pop();
      const s = current();
      if (!game.isTerminal(s) && s.player === humanPlayer) break;
    }
    refresh();
    // If the human plays second, undoing to the start leaves the AI to move.
    maybeRequestAI();
  }

  worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
    const msg = ev.data;
    switch (msg.type) {
      case 'ready':
        workerReady = true;
        refresh();
        maybeRequestAI();
        break;
      case 'error':
        thinking = false;
        setStatus(
          'Failed to load the AI (your browser may not support WebAssembly). ' + msg.message,
        );
        break;
      case 'progress':
        if (msg.id === searchId) setStatus(`AI is thinking… ${msg.done}/${msg.total}`);
        break;
      case 'move':
        if (msg.id !== searchId) return; // stale result after undo/new game
        thinking = false;
        applyAction(msg.action);
        break;
    }
  };
  worker.onerror = (ev) => {
    setStatus(`Failed to start the AI worker: ${ev.message}`);
  };

  els.newGame.addEventListener('click', newGame);
  els.undo.addEventListener('click', undo);
  els.seat.addEventListener('change', newGame);

  send({ type: 'init', modelUrl: '/santorini/az.onnx' });
  refresh();
}
