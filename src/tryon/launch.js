/**
 * AR-115: start a try-on — from a viewer's own button or from any platform's button through
 * AtlasAR.tryon.open(options). The try-on code (atlasar-tryon.js, the tracker and its model) loads
 * on the first call, never with the page.
 */
import { emit } from '../dom.js';
import { assetsBase } from '../assets.js';
import { normalize } from '../options.js';
import { getTryonPipeline } from './pipeline.js';
import { category } from './registry.js';

let loading = null;

function loadTryOn() {
    if (window.AtlasARTryOn) return Promise.resolve(window.AtlasARTryOn);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `${assetsBase()}atlasar-tryon.js`;
        s.crossOrigin = 'anonymous';
        s.async = true;
        s.onload = () => (window.AtlasARTryOn ? resolve(window.AtlasARTryOn) : reject(new Error('try-on did not load')));
        s.onerror = () => {
            loading = null;
            reject(new Error('try-on could not be loaded'));
        };
        document.head.append(s);
    });
    return loading;
}

/**
 * Run one session.
 * @param {object} o        normalized options (o.tryon = a registered category, o.src = the model)
 * @param {object} ctx      { target: element that gets the atlasar:* events, returnFocus }
 */
export async function launch(o, { target = document, returnFocus = null } = {}) {
    const cat = category(o.tryon);
    const fire = (name, detail) => emit(target, name, detail);
    if (!cat) {
        fire('error', { reason: `tryon: unknown category "${o.tryon}"` });
        return null;
    }
    if (!o.src) {
        fire('error', { reason: 'tryon: no model (src)' });
        return null;
    }
    try {
        const tryOn = await loadTryOn();
        return await tryOn.start({
            options: o,
            category: cat,
            assetsBase: assetsBase(),
            pipeline: o.premium === false ? null : getTryonPipeline(), // AR-112: a Free plan's model
            returnFocus,
            emit: fire,
        });
    } catch (err) {
        fire('error', { reason: `tryon: ${err.message}` });
        return null;
    }
}

/**
 * AtlasAR.tryon.open({ src, tryon: 'glasses', tryonLabel, tryonConsent, … }) — same option names
 * as a viewer. Events (atlasar:tryon-open, -ready, -snapshot, -close, -calibration-save, error)
 * fire on `target` (default: document).
 * @returns {Promise<object|null>} the session window, or null when it could not start
 */
export function open(options = {}, { target, returnFocus } = {}) {
    const o = normalize(options);
    return launch(o, {
        target: target || document,
        returnFocus: returnFocus || (document.activeElement instanceof HTMLElement ? document.activeElement : null),
    });
}
