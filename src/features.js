/**
 * AR-109: feature modules. The core SDK holds the Free features; Premium features (hotspots,
 * dimensions, slider, variants, the Pro try-on) are separate modules that plug in here:
 *   - on WordPress they ship only in the AtlasAR Pro plugin (wp.org: no premium code in Free);
 *   - on other sites AtlasAR Cloud serves them, enabled by the account's plan.
 *
 * A feature: { name, setup(api) → teardown? } where api = {
 *   host,            the <atlasar-viewer> element
 *   options,         the viewer's normalized options (read only)
 *   renderer,        'model-viewer' | 'fallback' | …
 *   modelViewer,     the <model-viewer> element, or null with the fallback renderer
 *   box,             the viewer box (to add overlays)
 *   on(name, fn),    listen to the viewer's atlasar:* events (removed on teardown)
 *   addStyles(id, css, file)  the feature's CSS, once per page (constructable stylesheet: CSP-safe;
 *                    else <link> to `file` next to atlasar.js)
 *   expose(name, fn) a method on the <atlasar-viewer> element, e.g. setVariant (removed on teardown)
 *   emit(name, detail)  fire atlasar:<name> on the viewer
 * }
 * setup runs once per viewer, after the model is shown; whatever it returns (a function) runs
 * when the viewer is destroyed or rebuilt. A feature turns itself on only when its own options are
 * present (e.g. options.hotspots), so loading a module never changes a viewer that does not use it.
 */

import { assetsBase } from './assets.js';

const features = new Map();

export function use(feature) {
    if (!feature || typeof feature.name !== 'string' || typeof feature.setup !== 'function') {
        throw new TypeError('A feature needs a name and setup(api).');
    }
    features.set(feature.name, feature);
    // Viewers already on the page pick it up.
    document.dispatchEvent(new CustomEvent('atlasar:feature-added', { detail: { name: feature.name } }));
}

export const featureNames = () => [...features.keys()];

const styled = new Set();
/**
 * A feature's CSS, added once per page. `file` (next to atlasar.js) is linked instead in browsers
 * without constructable stylesheets.
 */
export function addStyles(id, css, file = '') {
    if (styled.has(id)) return;
    styled.add(id);
    try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    } catch {
        if (!file || styled.has(`file:${file}`)) return;
        styled.add(`file:${file}`);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${assetsBase()}${file}`;
        document.head.append(link);
    }
}

/** Run every feature for one viewer; returns the teardown for all of them. */
export function setupFeatures(api, only = null) {
    const teardowns = [];
    for (const f of features.values()) {
        if (only && !only.includes(f.name)) continue;
        try {
            const t = f.setup(api);
            if (typeof t === 'function') teardowns.push(t);
        } catch (err) {
            // One broken feature never breaks the viewer.
            console.error(`[AtlasAR] feature "${f.name}" failed:`, err);
        }
    }
    return () => {
        for (const t of teardowns.splice(0)) {
            try { t(); } catch (err) { console.error('[AtlasAR] feature teardown failed:', err); }
        }
    };
}
