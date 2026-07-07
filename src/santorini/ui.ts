/**
 * DOM board UI: renders a State into a 5x5 grid and runs the human-input
 * state machine, emitting a complete action id via the onAction callback.
 *
 * Selection flow for a full move: SELECT_WORKER -> SELECT_MOVE ->
 * SELECT_BUILD. Moving onto height 3 wins immediately: the engine still
 * needs a build direction in the action id, so any legal one is auto-picked
 * and the action submits without a build prompt. During SETUP a single click
 * on an empty cell places a worker. Escape or re-clicking the selected
 * worker deselects; clicking the other own worker reselects.
 */

import { N, WIN_H, DOME, decodeAction, isSetup, type State } from './game';

type Phase = 'idle' | 'selectWorker' | 'selectMove' | 'selectBuild';

export interface UICallbacks {
  onAction: (action: number) => void;
}

interface CellHighlight {
  selectable: boolean;
  selected: boolean;
  moveTarget: boolean;
  buildTarget: boolean;
}

export class BoardUI {
  private readonly cells: HTMLButtonElement[] = [];
  private state: State | null = null;
  private legal: number[] = [];
  private interactive = false;

  private phase: Phase = 'idle';
  /** Selected worker square (x,y) during selectMove/selectBuild. */
  private selX = -1;
  private selY = -1;
  /** Chosen move direction during selectBuild. */
  private moveDir = -1;

  constructor(root: HTMLElement, private readonly callbacks: UICallbacks) {
    root.classList.add('sant-board');
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'sant-cell';
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.setAttribute('aria-label', `cell ${x},${y}`);
        cell.addEventListener('click', () => this.onCellClick(x, y));
        root.appendChild(cell);
        this.cells[x * N + y] = cell;
      }
    }
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') this.clearSelection();
    });
  }

  /** Show `state`; enable input iff `interactive` (it is the human's turn). */
  setPosition(state: State, legal: number[], interactive: boolean): void {
    this.state = state;
    this.legal = legal;
    this.interactive = interactive;
    this.phase = interactive ? 'selectWorker' : 'idle';
    this.selX = -1;
    this.selY = -1;
    this.moveDir = -1;
    this.render();
  }

  clearSelection(): void {
    if (this.phase === 'selectMove' || this.phase === 'selectBuild') {
      this.phase = 'selectWorker';
      this.selX = -1;
      this.selY = -1;
      this.moveDir = -1;
      this.render();
    }
  }

  // ----- input state machine -----

  private onCellClick(x: number, y: number): void {
    if (!this.interactive || !this.state) return;
    const s = this.state;

    if (isSetup(s)) {
      const action = y * N + x;
      if (this.legal.includes(action)) this.callbacks.onAction(action);
      return;
    }

    const ownWorker = this.isOwnWorker(x, y);

    switch (this.phase) {
      case 'selectWorker':
        if (ownWorker && this.workerHasMoves(x, y)) {
          this.phase = 'selectMove';
          this.selX = x;
          this.selY = y;
          this.render();
        }
        break;

      case 'selectMove': {
        if (x === this.selX && y === this.selY) {
          this.clearSelection();
          return;
        }
        if (ownWorker) {
          if (this.workerHasMoves(x, y)) {
            this.selX = x;
            this.selY = y;
            this.render();
          }
          return;
        }
        const candidates = this.movesFromSelected().filter((d) => d.tx === x && d.ty === y);
        if (candidates.length === 0) return;
        if (s.heights[x * N + y] === WIN_H) {
          // Winning move: build part is a formality — submit the first
          // (lowest-id) candidate without prompting for a build.
          this.callbacks.onAction(candidates[0].action);
          return;
        }
        this.phase = 'selectBuild';
        this.moveDir = candidates[0].mdir;
        this.render();
        break;
      }

      case 'selectBuild': {
        const match = this.buildsFromSelected().find((d) => d.bx === x && d.by === y);
        if (match) {
          this.callbacks.onAction(match.action);
        } else if (ownWorker || (x === this.selX && y === this.selY && !this.canBuildAt(x, y))) {
          this.clearSelection();
        }
        break;
      }
    }
  }

  private isOwnWorker(x: number, y: number): boolean {
    const s = this.state!;
    const p = s.player;
    for (let i = 0; i < 2; i++) {
      if (s.workers[p * 4 + i * 2] === x && s.workers[p * 4 + i * 2 + 1] === y) return true;
    }
    return false;
  }

  private decodedLegal(): Array<ReturnType<typeof decodeAction> & { action: number }> {
    return this.legal.map((a) => ({ ...decodeAction(a), action: a }));
  }

  private workerHasMoves(x: number, y: number): boolean {
    return this.decodedLegal().some((d) => d.fx === x && d.fy === y);
  }

  private movesFromSelected() {
    return this.decodedLegal().filter((d) => d.fx === this.selX && d.fy === this.selY);
  }

  private buildsFromSelected() {
    return this.movesFromSelected().filter((d) => d.mdir === this.moveDir);
  }

  private canBuildAt(x: number, y: number): boolean {
    return this.buildsFromSelected().some((d) => d.bx === x && d.by === y);
  }

  // ----- rendering -----

  private highlight(x: number, y: number): CellHighlight {
    const out: CellHighlight = {
      selectable: false,
      selected: false,
      moveTarget: false,
      buildTarget: false,
    };
    if (!this.interactive || !this.state) return out;
    const s = this.state;

    if (isSetup(s)) {
      out.selectable = this.legal.includes(y * N + x);
      return out;
    }
    switch (this.phase) {
      case 'selectWorker':
        out.selectable = this.isOwnWorker(x, y) && this.workerHasMoves(x, y);
        break;
      case 'selectMove':
        out.selected = x === this.selX && y === this.selY;
        out.moveTarget = this.movesFromSelected().some((d) => d.tx === x && d.ty === y);
        out.selectable = out.moveTarget || (this.isOwnWorker(x, y) && this.workerHasMoves(x, y));
        break;
      case 'selectBuild': {
        const moved = this.buildsFromSelected()[0];
        out.selected = moved !== undefined && x === moved.tx && y === moved.ty;
        out.buildTarget = this.canBuildAt(x, y);
        out.selectable = out.buildTarget;
        break;
      }
    }
    return out;
  }

  private render(): void {
    const s = this.state;
    if (!s) return;

    // During selectBuild show the worker on its move target, not its origin.
    let ghostFrom = -1;
    let ghostTo = -1;
    if (this.phase === 'selectBuild') {
      const moved = this.buildsFromSelected()[0];
      if (moved) {
        ghostFrom = this.selX * N + this.selY;
        ghostTo = moved.tx * N + moved.ty;
      }
    }

    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        const i = x * N + y;
        const cell = this.cells[i];
        const h = s.heights[i];
        const hl = this.highlight(x, y);

        let workerOf = -1;
        for (let p = 0; p < 2; p++) {
          for (let w = 0; w < 2; w++) {
            if (s.workers[p * 4 + w * 2] === x && s.workers[p * 4 + w * 2 + 1] === y) workerOf = p;
          }
        }
        if (i === ghostFrom) workerOf = -1;
        if (i === ghostTo) workerOf = s.player;

        cell.className = 'sant-cell';
        cell.classList.add(`sant-h${Math.min(h, WIN_H)}`);
        if (h === DOME) cell.classList.add('sant-dome');
        if (hl.selectable) cell.classList.add('sant-selectable');
        if (hl.selected) cell.classList.add('sant-selected');
        if (hl.moveTarget) cell.classList.add('sant-move-target');
        if (hl.buildTarget) cell.classList.add('sant-build-target');
        cell.disabled = !this.interactive;

        cell.innerHTML = '';
        const level = document.createElement('span');
        level.className = 'sant-level';
        level.textContent = h > 0 && h < DOME ? String(h) : '';
        cell.appendChild(level);
        if (h === DOME) {
          const dome = document.createElement('span');
          dome.className = 'sant-dome-cap';
          cell.appendChild(dome);
        } else if (workerOf >= 0) {
          const tok = document.createElement('span');
          tok.className = `sant-worker sant-p${workerOf}`;
          if (i === ghostTo) tok.classList.add('sant-ghost');
          cell.appendChild(tok);
        }
      }
    }
  }
}
