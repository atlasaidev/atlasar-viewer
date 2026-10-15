/**
 * AR-109: the renderers, best first. A renderer is
 *   { name, supported(caps) → boolean, mount(stage, options, ctx) → Promise<{ element, update(options), destroy() }> }
 * ctx = { caps, emit(name, detail), fail(reason) }.
 * Adding another engine (three.js directly, WebGPU…) means adding it here; sites change nothing.
 * `AtlasAR.registerRenderer()` lets a page add its own, ahead of the built-in ones.
 */
import modelViewer from './modelViewer.js';
import fallback from './fallback.js';

const renderers = [modelViewer, fallback];

export function registerRenderer(renderer) {
    if (!renderer || typeof renderer.name !== 'string' || typeof renderer.mount !== 'function' || typeof renderer.supported !== 'function') {
        throw new TypeError('A renderer needs name, supported(caps) and mount(stage, options, ctx).');
    }
    const i = renderers.findIndex((r) => r.name === renderer.name);
    if (i >= 0) renderers.splice(i, 1);
    renderers.unshift(renderer);
}

/** The renderer to use: the one asked for if this browser supports it, else the best supported one. */
export function pickRenderer(wanted, caps) {
    if (wanted && wanted !== 'auto') {
        const r = renderers.find((x) => x.name === wanted);
        if (r && r.supported(caps)) return r;
    }
    return renderers.find((r) => r.supported(caps)) || fallback;
}

export { fallback };
