# AtlasAR viewer SDK

Show 3D models with AR and a virtual try-on on any website: Shopify, custom shops, React or plain
HTML. It's the same viewer as the [AtlasAR WordPress plugin](https://wordpress.org/plugins/ar-vr-3d-model-try-on/).
It's plain JavaScript (ES modules), with no framework and no build step on your side.

```html
<script src="https://api.atlasar.example/sdk/v1/atlasar.js" defer></script>

<atlasar-viewer model="mdl_4f8Q…"></atlasar-viewer>
```

The full guide covers every option, events, styling, translation and security settings:
**https://atlasar.example/docs/sdk/**

## What it does

- **3D viewer:** lighting, shadow, auto-rotate, camera, zoom, size and layout. Draco, Meshopt and
  KTX2 models are supported, and the decoders are self-hosted.
- **AR:**
  - Android Scene Viewer, iPhone Quick Look and WebXR, placed on the floor or a wall.
  - Your own AR button.
  - A QR code on computers, so visitors can continue on their phone.
- **Display:** inline, or a "View in 3D" button that opens a popup with full screen.
- **Loading:** the viewer loads when it scrolls into view or after a click, so pages stay fast.
- **Every browser:** where 3D can't be drawn (no WebGL), it shows the poster or 360° images and the
  phone's own AR app, never an empty box.
- **Virtual try-on** for glasses and hats with the front camera:
  - The visitor sees a consent step first.
  - The video never leaves the browser.
  - Photos are saved on the visitor's device.
- **Under a strict security policy:** no inline scripts or styles.
- **Open for extension:** `AtlasAR.use()` adds feature modules, `AtlasAR.registerRenderer()` adds
  engines, and `AtlasAR.setTryonPipeline()` changes the try-on.

Premium features (hotspots, dimensions, several models, colour and material variants, and the 3D
try-on) are separate modules. They come with an AtlasAR Cloud Premium plan or the AtlasAR Pro
plugin, and they are not in this repository.

## Use it

**From AtlasAR Cloud:** add one script, then use `<atlasar-viewer model="mdl_…">`. The model's files,
name and saved settings come from AtlasAR Cloud. No API key goes into the page.

**With your own files:**

```html
<atlasar-viewer src="/models/chair.glb" ios-src="/models/chair.usdz" poster="/img/chair.webp"
    alt="Oak chair" display="popup"></atlasar-viewer>
```

**From JavaScript:**

```js
const viewer = AtlasAR.mount('#product-3d', { model: 'mdl_4f8Q…', autoRotate: true });
viewer.element.addEventListener('atlasar:ready', (e) => console.log(e.detail.renderer));
```

**npm** (coming soon):

```js
import AtlasAR from '@atlasaidev/atlasar-viewer';
```

## Self-hosting

`dist/` is ready to serve as it is. Put it on your server and load `dist/atlasar.js`. The files
next to it (`vendor/`, `atlasar-tryon.js`, `tryon-worker.js`) load from the same folder. If you
bundle the module build into your own app instead, tell it where the files are:
`AtlasAR.configure({ assetsBase: '/static/atlasar/' })`.

The try-on also needs MediaPipe's runtime and face model in `vendor/mediapipe/`. They're left out
here because of their size (15 MB):

- `vision_wasm_module_internal.js` and `vision_wasm_module_internal.wasm`, from the
  `@mediapipe/tasks-vision@0.10.35` npm package (`wasm/` folder).
- `face_landmarker.task`, from
  `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`.

AtlasAR Cloud serves all of these for you.

## Build

```sh
npm install
npm run build
```

`build.js` bundles `src/` with esbuild into `dist/`, and copies model-viewer and the decoders from
`node_modules`.

## Browser support

The 3D viewer runs in current Chrome, Edge, Firefox and Safari (iOS 16.4+). Other browsers get the
fallback. The try-on needs an https page, a camera, WebGL and WebAssembly SIMD.

## Licence

**GPL-2.0-or-later** (see `LICENSE`). Third-party components and their licences are listed in
`THIRD-PARTY-NOTICES.md`. Some of them are Apache-2.0, which is compatible with GPL version 3, so
the combined work is used under GPL-3.0.

Made by [AtlasAiDev](https://atlasaidev.com/).
