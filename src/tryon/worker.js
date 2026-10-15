/**
 * AR-111: the face tracker, off the main thread (plugin: face-landmarker.worker.js). Built into
 * tryon-worker.js with MediaPipe Tasks Vision 0.10.35 (Apache-2.0) included; its WebAssembly and
 * the face model load from AtlasAR Cloud (module mode, so it works in a module worker).
 *
 * In:  { type: 'init', wasmBase, modelUrl, options: { numFaces, facialMatrix } }
 *      { type: 'detect', bitmap, ts }   { type: 'dispose' }
 * Out: { type: 'ready' } · { type: 'result', landmarks, facialMatrix } · { type: 'error', message }
 */
import { FilesetResolver, FaceLandmarker } from '../../vendor/mediapipe/vision_bundle.mjs';

let landmarker = null;
const fail = (message) => self.postMessage({ type: 'error', message: String(message).slice(0, 300) });
self.addEventListener('unhandledrejection', (e) => fail(e.reason && e.reason.message ? e.reason.message : e.reason));

self.onmessage = async (event) => {
    const d = event.data || {};
    try {
        if (d.type === 'init') {
            const files = await FilesetResolver.forVisionTasks(d.wasmBase, true);
            const opts = d.options || {};
            const make = (delegate) => FaceLandmarker.createFromOptions(files, {
                baseOptions: { modelAssetPath: d.modelUrl, delegate },
                runningMode: 'VIDEO',
                numFaces: Math.min(4, Math.max(1, Number(opts.numFaces) || 1)),
                outputFaceBlendshapes: false,
                outputFacialTransformationMatrixes: !!opts.facialMatrix,
            });
            try {
                landmarker = await make('GPU');
            } catch {
                landmarker = await make('CPU'); // no GPU in the worker (some browsers): slower but works
            }
            self.postMessage({ type: 'ready' });
        } else if (d.type === 'detect') {
            if (!landmarker || !d.bitmap) {
                if (d.bitmap && d.bitmap.close) d.bitmap.close();
                self.postMessage({ type: 'result', landmarks: null });
                return;
            }
            const r = landmarker.detectForVideo(d.bitmap, d.ts || performance.now());
            d.bitmap.close();
            const m = r && r.facialTransformationMatrixes && r.facialTransformationMatrixes[0];
            self.postMessage({
                type: 'result',
                landmarks: r && r.faceLandmarks && r.faceLandmarks[0] ? r.faceLandmarks[0] : null,
                facialMatrix: m && m.data ? Array.from(m.data) : null,
            });
        } else if (d.type === 'dispose' && landmarker) {
            landmarker.close();
            landmarker = null;
        }
    } catch (err) {
        fail(err && err.message ? err.message : err);
    }
};
