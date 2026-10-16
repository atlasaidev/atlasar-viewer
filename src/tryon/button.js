/**
 * AR-111: the "Try it on" button of a viewer (core, Free). The try-on code itself (atlasar-tryon.js,
 * the face tracker and its model) loads only when the visitor clicks, never with the page.
 * AR-115: any registered category (tryon/registry.js); the start itself is shared (launch.js).
 */
import { el } from '../dom.js';
import { category } from './registry.js';
import { launch } from './launch.js';

/** The button for one viewer, or null when try-on is off or the category is not registered. */
export function tryonButton(host, o) {
    if (!o.tryon || !category(o.tryon)) return null;
    const button = el('button', { type: 'button', class: 'atlasar-tryon-button', 'aria-haspopup': 'dialog' }, [
        el('span', { class: 'atlasar-icon atlasar-icon-face', 'aria-hidden': 'true' }),
        el('span', {}, o.tryonLabel),
    ]);
    if (o.tryonAccent) button.style.setProperty('--atlasar-accent', o.tryonAccent);
    button.addEventListener('click', async () => {
        if (button.disabled) return;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        try {
            await launch(o, { target: host, returnFocus: button });
        } finally {
            button.disabled = false;
            button.removeAttribute('aria-busy');
            // The window may have closed while the button was disabled (it cannot take focus then).
            if (!document.activeElement || document.activeElement === document.body) button.focus();
        }
    });
    return button;
}
