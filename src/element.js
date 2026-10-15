/**
 * AR-109: <atlasar-viewer> — the one thing a site writes:
 *   <atlasar-viewer model="mdl_…"></atlasar-viewer>                 an AtlasAR Cloud model
 *   <atlasar-viewer src="chair.glb" ios-src="chair.usdz"></atlasar-viewer>  your own files
 *   <atlasar-viewer model="mdl_…" display="popup" button-label="View in 3D"></atlasar-viewer>
 * Options: attributes (kebab-case) or the `options` property (camelCase); see options.js.
 * Events (bubble): atlasar:ready, atlasar:load, atlasar:error, atlasar:ar-status,
 * atlasar:renderer-fallback, atlasar:open, atlasar:close.
 */
import { ATTRIBUTES, fromAttributes, normalize } from './options.js';
import { fetchModel, modelOptions } from './cloud.js';
import { Viewer } from './viewer.js';
import { Popup } from './modal.js';
import { applyStyles, scopedStyle } from './styles.js';
import { el, emit } from './dom.js';
import { tryonButton } from './tryon/button.js';
import { capabilities } from './capabilities.js';

export class AtlasARViewerElement extends HTMLElement {
    static get observedAttributes() {
        return ATTRIBUTES;
    }

    constructor() {
        super();
        this._code = {}; // options set from JavaScript
        this._cloud = null; // the AtlasAR Cloud model's options
        this._viewer = null;
        this._popup = null;
        this._trigger = null;
        this._unstyle = null;
        this._pending = null;
        this._token = 0;
    }

    /** Options from code (merged over attributes). */
    get options() {
        return { ...this._code };
    }

    set options(value) {
        this._code = value && typeof value === 'object' ? { ...value } : {};
        this.schedule();
    }

    /** The options in use now (after defaults, cloud model, attributes and code). */
    get resolvedOptions() {
        return normalize(this._cloud, fromAttributes(this), this._code);
    }

    /** The <model-viewer> element (null until ready, or with the fallback renderer). */
    get modelViewer() {
        return this._viewer ? this._viewer.modelViewer() : null;
    }

    connectedCallback() {
        applyStyles();
        this.schedule();
    }

    disconnectedCallback() {
        this.teardown();
    }

    attributeChangedCallback() {
        if (this.isConnected) this.schedule();
    }

    /** Many attribute changes in one task → one rebuild. */
    schedule() {
        if (this._pending) return;
        this._pending = Promise.resolve().then(() => {
            this._pending = null;
            if (this.isConnected) this.render();
        });
    }

    async render() {
        const token = ++this._token;
        let o = this.resolvedOptions;
        if (o.model && (!this._cloud || this._cloud.__id !== o.model)) {
            try {
                const m = await fetchModel(o.model, o.apiBase);
                if (token !== this._token) return; // a newer render started
                this._cloud = { ...modelOptions(m), __id: o.model };
            } catch (err) {
                if (token !== this._token) return;
                this._cloud = { __id: o.model };
                emit(this, 'error', { reason: err.message });
            }
            o = this.resolvedOptions;
        }
        // Same structure: update in place (no reload). A different display: rebuild.
        if (this._viewer && this._display === o.display && this._viewerSrc === o.src && this._renderer === o.renderer) {
            this._viewer.update(o);
            this.restyle(o);
            return;
        }
        this.teardown();
        this._display = o.display;
        this._viewerSrc = o.src;
        this._renderer = o.renderer;
        this.restyle(o);
        if (o.display === 'popup') this.buildPopup(o);
        else {
            this._viewer = new Viewer(this, o);
            this._viewer.attach(this);
        }
    }

    restyle(o) {
        if (this._unstyle) this._unstyle();
        this._unstyle = scopedStyle(this, o.css);
    }

    buildPopup(o) {
        const button = el('button', { type: 'button', class: 'atlasar-trigger', 'aria-haspopup': 'dialog' }, [
            el('span', { class: 'atlasar-icon atlasar-icon-cube', 'aria-hidden': 'true' }),
            el('span', {}, o.buttonLabel || o.strings.viewIn3d),
        ]);
        const tryon = capabilities().modelViewer ? tryonButton(this, o) : null; // AR-111
        this._trigger = el('div', { class: 'atlasar-trigger-wrap', 'data-align': o.align }, [button, tryon]);
        this.append(this._trigger);
        this._popup = new Popup(o, {
            onOpen: (body) => {
                // The viewer is made on the first open only (nothing loads before the click).
                if (!this._viewer) {
                    this._viewer = new Viewer(this, { ...this.resolvedOptions, load: 'immediate' });
                    this._viewer.attach(body);
                }
                emit(this, 'open');
            },
            onClose: () => emit(this, 'close'),
        });
        button.addEventListener('click', () => this._popup.open());
    }

    /** Open / close the popup from code (display="popup"). */
    open() {
        if (this._popup) this._popup.open();
    }

    close() {
        if (this._popup) this._popup.close();
    }

    teardown() {
        if (this._viewer) this._viewer.destroy();
        if (this._popup) this._popup.destroy();
        if (this._trigger) this._trigger.remove();
        if (this._unstyle) this._unstyle();
        this._viewer = null;
        this._popup = null;
        this._trigger = null;
        this._unstyle = null;
    }
}

export function defineElement(name = 'atlasar-viewer') {
    if (!customElements.get(name)) customElements.define(name, AtlasARViewerElement);
}
