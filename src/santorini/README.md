# Santorini vs AlphaZero (browser)

TypeScript port of the [santorini-marl](https://github.com/KennethJAllen/santorini-marl)
AlphaZero engine (`santorini/az/fastgame.py`, `mcts.py`) running the trained net fully
client-side with onnxruntime-web. Served at `/santorini/` via
`src/pages/santorini/index.astro`.

## Committed artifacts (regenerate from santorini-marl)

CI cannot see the model repo, so two generated files are committed here:

- `public/santorini/az.onnx` — the exported network:
  `uv run python -m santorini.az.export_onnx` (in santorini-marl), then copy
  `models/az/az.onnx` here.
- `src/santorini/test/parity_vectors.json` — recorded games / net outputs / MCTS
  visit counts used by the vitest parity suites:
  `uv run python -m santorini.az.export_parity_vectors`, then copy
  `models/az/parity_vectors.json` here. (Lives under `src/` so it is not shipped
  to `dist/`.)

Regenerate **both together** whenever the model changes.

The onnxruntime wasm binary in `public/santorini/ort/` is *not* committed; it is
copied from `node_modules` by `scripts/copy-ort-wasm.mjs` (predev/prebuild hooks)
so the hosted wasm always matches the bundled JS version. The worker imports
`onnxruntime-web/wasm` (embedded loader) and sets `env.wasm.wasmPaths` in object
form pointing at just the `.wasm` — a string prefix would make ort `import()` the
`.mjs` loader from `/public`, which Vite dev rejects.

## Tests

`npm test` runs three parity suites against the JSON vectors: `game.parity`
(engine replay: states, legal actions, observations, keys), `net.parity`
(onnxruntime-node vs recorded PyTorch logits/values), `mcts.parity` (search
behavior). The #1 regression risk in this code is x/y-major confusion —
`heights` is `[x][y]` but the action space is y-major — and the game parity
suite catches it immediately.
