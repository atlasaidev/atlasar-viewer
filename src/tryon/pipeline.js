/**
 * AR-111: the try-on pipeline hooks — how Premium (atlasar-pro.js) changes the Free try-on
 * without the Free code knowing any Premium detail (plugin: window.atlasArTryonPipeline).
 *
 *   AtlasAR.setTryonPipeline({
 *     watermark: false,          // Free snapshots carry "Powered by AtlasAR"
 *     hd: true,                  // snapshots at 2× size
 *     facialMatrix: true,        // ask the face tracker for the 3D head pose
 *     numFaces: 1,
 *     adjustAnchor(anchor, ctx), // move/scale/rotate the 2D overlay (calibration)
 *     render(drawCtx),           // draw the accessory yourself (3D); return false to use the 2D overlay
 *     tools(container, ctx),     // optional panel inside the try-on window (calibration sliders)
 *     dispose(),                 // the try-on window closed
 *   })
 */

let pipeline = null;

export function setTryonPipeline(p) {
    pipeline = p && typeof p === 'object' ? p : null;
}

export const getTryonPipeline = () => pipeline;
