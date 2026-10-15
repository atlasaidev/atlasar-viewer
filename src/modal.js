/**
 * AR-109: the popup (plugin: "View in 3D" button → modal with title, full screen, close).
 * A native <dialog> (focus stays inside, Esc closes, the page behind is inert); browsers without
 * <dialog> get an equivalent role="dialog" box with the same keys.
 */
import { el } from './dom.js';
import { capabilities } from './capabilities.js';

export class Popup {
    constructor(o, { onOpen, onClose } = {}) {
        this.o = o;
        this.onOpen = onOpen;
        this.onClose = onClose;
        this.returnFocus = null;
        this.isOpen = false;
        const s = o.strings;
        this.native = capabilities().dialog;

        const title = el('h2', { class: 'atlasar-popup-title' }, o.title || o.alt);
        this.fullBtn = el('button', { type: 'button', class: 'atlasar-popup-full', 'aria-label': s.fullscreen, title: s.fullscreen },
            el('span', { class: 'atlasar-icon atlasar-icon-expand', 'aria-hidden': 'true' }));
        const closeX = el('button', { type: 'button', class: 'atlasar-popup-x', 'aria-label': s.close, title: s.close }, '×');
        const closeBtn = el('button', { type: 'button', class: 'atlasar-popup-close' }, s.close);
        this.body = el('div', { class: 'atlasar-popup-body' });
        this.panel = el('div', { class: 'atlasar-popup-panel' }, [
            el('div', { class: 'atlasar-popup-head' }, [title, el('div', { class: 'atlasar-popup-actions' }, [capabilities().fullscreen ? this.fullBtn : null, closeX])]),
            this.body,
            el('div', { class: 'atlasar-popup-foot' }, closeBtn),
        ]);
        this.root = this.native
            ? el('dialog', { class: 'atlasar-popup', 'aria-label': o.title || s.dialogLabel }, this.panel)
            : el('div', { class: 'atlasar-popup atlasar-popup-legacy', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || s.dialogLabel, hidden: true, tabindex: '-1' }, this.panel);

        closeX.addEventListener('click', () => this.close());
        closeBtn.addEventListener('click', () => this.close());
        this.fullBtn.addEventListener('click', () => this.toggleFullscreen());
        // A click on the dark backdrop (outside the panel) closes it.
        this.root.addEventListener('click', (e) => { if (e.target === this.root) this.close(); });
        if (this.native) {
            // Esc: close through our own path (the dialog's 'close' event can arrive late, e.g. in
            // a background tab); 'close' still covers anything else that closes it.
            this.root.addEventListener('cancel', (e) => { e.preventDefault(); this.close(); });
            this.root.addEventListener('close', () => this.closed());
        } else {
            this.root.addEventListener('keydown', (e) => this.legacyKeys(e));
        }
        document.addEventListener('fullscreenchange', () => this.fullscreenLabel());
        document.body.append(this.root);
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.returnFocus = document.activeElement;
        if (this.native) this.root.showModal();
        else {
            this.root.hidden = false;
            this.root.focus();
        }
        document.documentElement.classList.add('atlasar-popup-open'); // locks page scrolling
        if (this.onOpen) this.onOpen(this.body);
    }

    close() {
        if (document.fullscreenElement === this.panel) document.exitFullscreen().catch(() => {});
        if (this.native) { if (this.root.open) this.root.close(); } else this.root.hidden = true;
        this.closed();
    }

    /** Runs once per opening, whichever way the popup was closed. */
    closed() {
        if (!this.isOpen) return;
        this.isOpen = false;
        document.documentElement.classList.remove('atlasar-popup-open');
        if (this.onClose) this.onClose();
        if (this.returnFocus && typeof this.returnFocus.focus === 'function') this.returnFocus.focus();
    }

    toggleFullscreen() {
        const p = this.panel;
        if (document.fullscreenElement === p) return document.exitFullscreen();
        const req = p.requestFullscreen || p.webkitRequestFullscreen;
        return req ? Promise.resolve(req.call(p)).catch(() => {}) : undefined;
    }

    fullscreenLabel() {
        const on = document.fullscreenElement === this.panel;
        const label = on ? this.o.strings.exitFullscreen : this.o.strings.fullscreen;
        this.fullBtn.setAttribute('aria-label', label);
        this.fullBtn.title = label;
        this.panel.classList.toggle('atlasar-is-fullscreen', on);
    }

    /** Esc and a simple focus trap for browsers without <dialog>. */
    legacyKeys(e) {
        if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
        if (e.key !== 'Tab') return;
        const items = [...this.root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), model-viewer')]
            .filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }

    destroy() {
        this.close();
        this.root.remove();
    }
}
