/**
 * Build the AtlasAR viewer SDK (the Free core) into dist/.
 *   npm install && npm run build
 * Outputs: atlasar.js (script tag, window.AtlasAR), atlasar.module.js (ES module), atlasar.css,
 * atlasar-tryon.js (loaded on the first "Try it on" click), tryon-worker.js (the face tracker),
 * vendor/ (model-viewer and the Draco / Meshopt / KTX2 decoders) and examples/.
 * Plain JavaScript; no TypeScript, no framework.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const out = path.join(root, 'dist');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const VENDOR = {
    'vendor/model-viewer.min.js': '@google/model-viewer/dist/model-viewer.min.js',
    'vendor/meshopt_decoder.js': 'meshoptimizer/meshopt_decoder.js',
    'vendor/draco/draco_wasm_wrapper.js': 'three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js',
    'vendor/draco/draco_decoder.wasm': 'three/examples/jsm/libs/draco/gltf/draco_decoder.wasm',
    'vendor/draco/draco_decoder.js': 'three/examples/jsm/libs/draco/gltf/draco_decoder.js',
    'vendor/basis/basis_transcoder.js': 'three/examples/jsm/libs/basis/basis_transcoder.js',
    'vendor/basis/basis_transcoder.wasm': 'three/examples/jsm/libs/basis/basis_transcoder.wasm',
};

const builds = [
    { entry: 'src/entry-script.js', file: 'atlasar.js', format: 'iife' },
    { entry: 'src/entry-module.js', file: 'atlasar.module.js', format: 'esm' },
    { entry: 'src/tryon/entry.js', file: 'atlasar-tryon.js', format: 'iife' },
    { entry: 'src/tryon/worker.js', file: 'tryon-worker.js', format: 'esm' },
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const b of builds) {
    const outfile = path.join(out, b.file);
    await esbuild.build({ entryPoints: [path.join(root, b.entry)], outfile, format: b.format, bundle: true, minify: true, target: ['es2020'], legalComments: 'eof' });
    fs.writeFileSync(outfile, fs.readFileSync(outfile, 'utf8').replace(/__ATLASAR_VERSION__/g, version));
    console.log(`${b.file} ${(fs.statSync(outfile).size / 1024).toFixed(1)} KB`);
}
const { CSS } = await import(pathToFileURL(path.join(root, 'src', 'styles.js')).href);
const { CSS: TRYON_CSS } = await import(pathToFileURL(path.join(root, 'src', 'tryon', 'ui.js')).href);
fs.writeFileSync(path.join(out, 'atlasar.css'), `/* AtlasAR viewer SDK ${version} */\n${CSS.trim()}\n${TRYON_CSS.trim()}\n`);
for (const [dest, src] of Object.entries(VENDOR)) {
    const to = path.join(out, dest);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(require.resolve(src), to);
}
fs.cpSync(path.join(root, 'examples'), path.join(out, 'examples'), { recursive: true });
fs.copyFileSync(path.join(root, 'THIRD-PARTY-NOTICES.md'), path.join(out, 'THIRD-PARTY-NOTICES.md'));
console.log(`vendor: ${Object.keys(VENDOR).length} files, version ${version}`);
