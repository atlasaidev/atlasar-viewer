/**
 * AR-115: try-on categories — the add-on contract.
 *
 * The engine (camera, tracker, frame loop, snapshot, window) is shared; a category only says
 * where and how a product sits on the body. The core registers `glasses` and `hat`; add-on packs
 * (earrings, lips, rings, watches, clothes…) register theirs the same way, before or after the
 * core loads:
 *
 *   AtlasAR.tryon.register('earrings', {
 *     requires: 1,                 // the engine contract (ENGINE) the category was built for
 *     tracker: 'face',             // which tracker it needs: face (hand, pose later)
 *     kind: 'glasses',             // preset for the Premium 3D renderer (glasses | hat)
 *     anchor(landmarks, canvas) {  // → { x, y, width, rotation } in canvas pixels, or null
 *       …
 *     },
 *   });
 *
 * Before the core is on the page, a pack can queue itself:
 *   (window.AtlasARTryOnQueue = window.AtlasARTryOnQueue || []).push(['earrings', { … }]);
 */
import { computeAnchor } from './anchors.js';

/** The engine contract version. Raise it only when a category written for the old one would break. */
export const ENGINE = 1;

/** Trackers the engine can run today. */
const TRACKERS = new Set(['face']);
const NAME = /^[a-z][a-z0-9-]{0,39}$/;

const categories = new Map();

/**
 * Add a category. Returns true when it is usable here; false (with a console note) when the name,
 * engine version or tracker does not fit.
 */
export function register(name, def) {
    const key = String(name || '').toLowerCase();
    if (!NAME.test(key) || !def || typeof def.anchor !== 'function') {
        console.warn(`[AtlasAR] try-on category "${name}" was not added: it needs a name and an anchor() function.`);
        return false;
    }
    const requires = Number(def.requires || 1);
    if (requires > ENGINE) {
        console.warn(`[AtlasAR] try-on category "${key}" needs engine ${requires}; this SDK has engine ${ENGINE}. Update the AtlasAR SDK.`);
        return false;
    }
    const tracker = def.tracker || 'face';
    if (!TRACKERS.has(tracker)) {
        console.warn(`[AtlasAR] try-on category "${key}" needs the ${tracker} tracker, which this SDK does not have yet.`);
        return false;
    }
    categories.set(key, Object.freeze({
        name: key,
        requires,
        tracker,
        kind: def.kind === 'hat' ? 'hat' : 'glasses',
        anchor: def.anchor,
    }));
    return true;
}

/** @returns {object|null} the registered category */
export const category = (name) => categories.get(String(name || '').toLowerCase()) || null;

/** @returns {string[]} the names of the registered categories */
export const names = () => [...categories.keys()];

// The core's own categories (Free): today's placement rules, unchanged.
register('glasses', { tracker: 'face', kind: 'glasses', anchor: (landmarks, canvas) => computeAnchor(landmarks, 'glasses', canvas) });
register('hat', { tracker: 'face', kind: 'hat', anchor: (landmarks, canvas) => computeAnchor(landmarks, 'hat', canvas) });

// Packs that loaded before the core queued themselves.
const queued = typeof window !== 'undefined' && Array.isArray(window.AtlasARTryOnQueue) ? window.AtlasARTryOnQueue : [];
queued.forEach(([name, def]) => register(name, def));
if (typeof window !== 'undefined') {
    window.AtlasARTryOnQueue = { push: ([name, def]) => register(name, def) };
}
