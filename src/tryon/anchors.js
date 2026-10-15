/**
 * AR-111: where the accessory goes on the face, from MediaPipe's 478 face landmarks (normalized
 * 0..1). Same rules as the plugin (tryon-anchors.js): glasses sit on the nose bridge at 2.0× the
 * eye distance; hats sit above the forehead at 2.4×.
 *   168 nose bridge · 33 / 263 outer eye corners · 10 forehead top
 */
const IDX = { noseBridge: 168, eyeRight: 33, eyeLeft: 263, foreheadTop: 10 };

/** @returns {{x:number,y:number,width:number,rotation:number}|null} canvas pixels and radians */
export function computeAnchor(landmarks, accessory, canvas) {
    if (!landmarks || landmarks.length < 200) return null;
    const r = landmarks[IDX.eyeRight];
    const l = landmarks[IDX.eyeLeft];
    if (!r || !l) return null;
    const rx = r.x * canvas.width;
    const ry = r.y * canvas.height;
    const lx = l.x * canvas.width;
    const ly = l.y * canvas.height;
    const eyeDistance = Math.hypot(lx - rx, ly - ry);
    const rotation = Math.atan2(ly - ry, lx - rx);
    if (accessory === 'hat') {
        const f = landmarks[IDX.foreheadTop];
        if (!f) return null;
        return { x: f.x * canvas.width, y: f.y * canvas.height - eyeDistance * 0.7, width: eyeDistance * 2.4, rotation };
    }
    const b = landmarks[IDX.noseBridge];
    if (!b) return null;
    return { x: b.x * canvas.width, y: b.y * canvas.height, width: eyeDistance * 2.0, rotation };
}
