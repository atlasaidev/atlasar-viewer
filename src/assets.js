/**
 * AR-109: where the SDK's own files live (model-viewer, decoders) and how they are loaded.
 * Everything is self-hosted next to atlasar.js (no third-party CDN), loaded once, and only when a
 * viewer actually needs it.
 */

let base = '';
let apiBase = '';
let modelViewerPromise = null;

/** Set by the entry file from the script's own URL; `configure()` can override it. */
export function setBase(url) {
    if (!url) return;
    base = String(url).replace(/[^/]*$/, ''); // the folder the script is in, with its trailing slash
    if (!apiBase) apiBase = new URL('../../', base).href; // …/sdk/v1/ → the AtlasAR Cloud origin
}
export function configure({ assetsBase, apiBase: api } = {}) {
    if (assetsBase) base = String(assetsBase).replace(/\/?$/, '/');
    if (api) apiBase = String(api).replace(/\/?$/, '/');
}
export const assetsBase = () => base;
export const cloudBase = () => apiBase;

/**
 * Load <model-viewer> once. If the page already has its own model-viewer, that one is used.
 * The decoders (Draco, Meshopt, KTX2) must be set before the element is defined.
 */
export function loadModelViewer() {
    if (customElements.get('model-viewer')) return Promise.resolve();
    if (modelViewerPromise) return modelViewerPromise;
    const vendor = `${base}vendor/`;
    const settings = (self.ModelViewerElement = self.ModelViewerElement || {});
    settings.dracoDecoderLocation = settings.dracoDecoderLocation || `${vendor}draco/`;
    settings.meshoptDecoderLocation = settings.meshoptDecoderLocation || `${vendor}meshopt_decoder.js`;
    settings.ktx2TranscoderLocation = settings.ktx2TranscoderLocation || `${vendor}basis/`;
    modelViewerPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = `${vendor}model-viewer.min.js`;
        script.crossOrigin = 'anonymous';
        script.dataset.atlasar = 'model-viewer';
        // Caching and optimisation plugins must leave it alone (same as the WordPress plugin).
        script.setAttribute('data-no-optimize', '1');
        script.setAttribute('data-cfasync', 'false');
        script.onload = () => customElements.whenDefined('model-viewer').then(resolve, reject);
        script.onerror = () => {
            modelViewerPromise = null;
            reject(new Error('model-viewer could not be loaded'));
        };
        document.head.appendChild(script);
    }).then(() => {
        document.dispatchEvent(new CustomEvent('atlasar:viewer-ready'));
    });
    return modelViewerPromise;
}
