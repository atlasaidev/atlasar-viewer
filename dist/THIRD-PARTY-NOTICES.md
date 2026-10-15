# Third-party software in the AtlasAR viewer SDK

All files are served from AtlasAR Cloud (or your own server); the SDK loads nothing from other
CDNs.

| Component | Version | Licence | Where |
|---|---|---|---|
| Google model-viewer | 3.5.0 | Apache-2.0 | `vendor/model-viewer.min.js` (includes three.js, MIT) |
| meshoptimizer decoder | 0.22.0 | MIT | `vendor/meshopt_decoder.js` |
| Draco decoder (via three.js) | three 0.163.0 | Apache-2.0 | `vendor/draco/` |
| Basis Universal transcoder (via three.js) | three 0.163.0 | Apache-2.0 | `vendor/basis/` |
| qrcode-generator (Kazuhiko Arase) | 2.0.2 | MIT | bundled into `atlasar.js` / `atlasar.module.js` |
| MediaPipe Tasks Vision (Google) | 0.10.35 | Apache-2.0 | bundled into `tryon-worker.js`; its WebAssembly runtime is served from `vendor/mediapipe/` by AtlasAR Cloud |
| MediaPipe Face Landmarker model (Google) | float16 v1 | Apache-2.0 | `vendor/mediapipe/face_landmarker.task`, served by AtlasAR Cloud |
