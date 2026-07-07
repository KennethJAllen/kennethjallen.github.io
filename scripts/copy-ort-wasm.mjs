// Copies the onnxruntime-web wasm runtime into public/santorini/ort/ so the
// hosted files always match the bundled JS version (no CDN, no version skew).
// Runs via the predev/prebuild hooks; public/santorini/ort/ is gitignored.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const dest = join(root, 'public', 'santorini', 'ort');

// Only the .wasm: the worker imports the bundle build (embedded .mjs loader)
// and points env.wasm.wasmPaths.wasm at this file.
mkdirSync(dest, { recursive: true });
const files = readdirSync(src).filter((f) => f === 'ort-wasm-simd-threaded.wasm');
if (files.length !== 1) {
  throw new Error(`expected ort-wasm-simd-threaded.wasm in ${src}, found: ${files.join(', ')}`);
}
for (const f of files) copyFileSync(join(src, f), join(dest, f));
console.log(`copied ${files.join(', ')} -> public/santorini/ort/`);
