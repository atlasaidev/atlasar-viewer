/**
 * AR-111: the "Try it on" button (core, Free). The try-on code itself (atlasar-tryon.js, the face
 * tracker and its model) loads only when the visitor clicks, never with the page.
 */
import { el, emit } from '../dom.js';
import { assetsBase } from '../assets.js';
import { getTryonPipeline } from './pipeline.js';

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

/** The button for one viewer, or null when try-on is off. */
export function tryonButton(host, o) {
    if (!o.tryon) return null;
    const button = el('button', { type: 'button', class: 'atlasar-tryon-button', 'aria-haspopup': 'dialog' }, [
        el('span', { class: 'atlasar-icon atlasar-icon-face', 'aria-hidden': 'true' }),
        el('span', {}, o.tryonLabel),
    ]);
    button.addEventListener('click', async () => {
        if (button.disabled) return;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        try {
            const tryOn = await loadTryOn();
            await tryOn.start({
                options: o,
                host,
                assetsBase: assetsBase(),
                pipeline: o.premium === false ? null : getTryonPipeline(), // AR-112: a Free site's model
                returnFocus: button,
                emit: (name, detail) => emit(host, name, detail),
            });
        } catch (err) {
            emit(host, 'error', { reason: `tryon: ${err.message}` });
        } finally {
            button.disabled = false;
            button.removeAttribute('aria-busy');
            // The window may have closed while the button was disabled (it cannot take focus then).
            if (!document.activeElement || document.activeElement === document.body) button.focus();
        }
    });
    return button;
}
