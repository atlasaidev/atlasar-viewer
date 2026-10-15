/**
 * AR-109: the AtlasAR viewer SDK — public API.
 *
 *   <script src="https://<atlasar-cloud>/sdk/v1/atlasar.js" defer></script>
 *   <atlasar-viewer model="mdl_…"></atlasar-viewer>
 *
 * or from code:
 *   const viewer = AtlasAR.mount('#product-3d', { model: 'mdl_…', display: 'popup' });
 *   viewer.element.addEventListener('atlasar:ready', …);
 *
 * Works in every browser: where 3D cannot be drawn, the fallback renderer shows the poster or
 * 360° images and opens the phone's own AR app (see renderers/).
 */
import { defineElement, AtlasARViewerElement } from './element.js';
import { configure as configureAssets, assetsBase, cloudBase } from './assets.js';
import { capabilities } from './capabilities.js';
import { registerRenderer } from './renderers/index.js';
import { use, featureNames } from './features.js';
import { DEFAULTS } from './options.js';
import { setTryonPipeline } from './tryon/pipeline.js';

export const VERSION = '__ATLASAR_VERSION__';

/**
 * Add a viewer to an element (or CSS selector) from code.
 * @returns {{ element: HTMLElement, update(options): void, open(): void, close(): void, destroy(): void }}
 */
export function mount(target, options = {}) {
    const parent = typeof target === 'string' ? document.querySelector(target) : target;
    if (!parent) throw new Error(`AtlasAR.mount: ${target} was not found.`);
    defineElement();
    const element = document.createElement('atlasar-viewer');
    element.options = options;
    parent.append(element);
    return {
        element,
        update(next) { element.options = { ...element.options, ...next }; },
        open() { element.open(); },
        /** Premium (atlasar-pro.js): show a colour or material variant. Returns false if unknown. */
        setVariant(value) { return typeof element.setVariant === 'function' ? element.setVariant(value) : false; },
        close() { element.close(); },
        destroy() { element.remove(); },
    };
}

/** Set where the SDK's files and the AtlasAR Cloud API are (needed only when you self-host them). */
export function configure(settings = {}) {
    configureAssets(settings);
}

export const AtlasAR = {
    VERSION,
    mount,
    configure,
    use,
    registerRenderer,
    setTryonPipeline,
    capabilities,
    features: featureNames,
    defaults: DEFAULTS,
    assetsBase,
    apiBase: cloudBase,
    Element: AtlasARViewerElement,
};

export { defineElement, use, registerRenderer, capabilities, AtlasARViewerElement };
export default AtlasAR;
