/**
 * AR-109: one viewer box — layout, the chosen renderer, loading and error states, the desktop QR
 * code, and when to load (plugin: model_load_strategy):
 *   load = 'visible'      load when the box scrolls near the screen (default)
 *          'interaction'  show the poster and a "View in 3D" button; load on click
 *          'immediate'    load at once
 * If the 3D engine cannot load (network, blocked script), the fallback renderer takes over.
 */
import { capabilities } from './capabilities.js';
import { pickRenderer, fallback } from './renderers/index.js';
import { qrControl } from './qr.js';
import { setupFeatures, addStyles } from './features.js';
import { tryonButton } from './tryon/button.js';
import { el, emit } from './dom.js';

export class Viewer {
    /**
     * @param {HTMLElement} host the <atlasar-viewer> element (events are fired on it)
     * @param {object} options normalized options (options.js normalize)
     */
    constructor(host, options) {
        this.host = host;
        this.o = options;
        this.caps = capabilities();
        this.instance = null;
        this.renderer = null;
        this.destroyed = false;
        this.observer = null;
        this.teardown = null;
        this.listeners = [];

        this.stage = el('div', { class: 'atlasar-stage' });
        this.overlay = el('div', { class: 'atlasar-overlay', 'aria-live': 'polite' });
        this.box = el('div', { class: 'atlasar-box' }, [this.stage, this.overlay]);
        this.layout();
        if (this.o.ar && this.o.qr && !this.caps.mobile) this.box.append(qrControl(this.o));
        // AR-111: virtual try-on (needs WebGL for the product picture and a camera).
        const tryon = this.caps.modelViewer ? tryonButton(host, options) : null;
        if (tryon) this.box.append(el('div', { class: 'atlasar-tryon-wrap' }, tryon));
    }

    layout() {
        const o = this.o;
        const s = this.box.style;
        s.width = o.width;
        s.height = o.height;
        s.margin = o.margin;
        s.padding = o.padding;
        s.backgroundColor = o.background;
        this.box.dataset.align = o.align;
    }

    /** Put the box in the page and start (now, when visible, or on click). */
    attach(parent) {
        parent.append(this.box);
        const o = this.o;
        if (o.load === 'immediate') return this.start();
        if (o.load === 'interaction') return this.waitForClick();
        if (!this.caps.intersectionObserver) return this.start();
        this.observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                this.observer.disconnect();
                this.observer = null;
                this.start();
            }
        }, { rootMargin: '100px' });
        this.observer.observe(this.box);
        return undefined;
    }

    waitForClick() {
        const o = this.o;
        const start = el('button', { type: 'button', class: 'atlasar-start' }, [
            el('span', { class: 'atlasar-icon atlasar-icon-cube', 'aria-hidden': 'true' }),
            el('span', {}, o.buttonLabel || o.strings.viewIn3d),
        ]);
        const poster = o.poster ? el('img', { class: 'atlasar-start-poster', src: o.poster, alt: o.alt }) : null;
        const wrap = el('div', { class: 'atlasar-start-wrap' }, [poster, start]);
        this.stage.append(wrap);
        start.addEventListener('click', () => {
            wrap.remove();
            // Keyboard users keep their place: focus moves into the viewer once the model shows.
            this.host.addEventListener('atlasar:load', () => this.focusViewer(), { once: true });
            this.start();
        }, { once: true });
    }

    /** Focus model-viewer's own control (inside its shadow root), else the viewer box. */
    focusViewer() {
        const host = this.modelViewer();
        const inner = host && host.shadowRoot && host.shadowRoot.querySelector('.userInput[tabindex="0"]');
        if (inner) inner.focus({ preventScroll: true });
        const inside = host && host.shadowRoot && host.shadowRoot.activeElement;
        if (!inside) {
            if (!this.box.hasAttribute('tabindex')) this.box.setAttribute('tabindex', '-1');
            this.box.focus({ preventScroll: true });
        }
    }

    busy(on) {
        this.overlay.replaceChildren();
        if (on) this.overlay.append(el('div', { class: 'atlasar-loading' }, [el('span', { class: 'atlasar-spinner', 'aria-hidden': 'true' }), el('span', {}, this.o.strings.loading)]));
    }

    ctx() {
        return {
            caps: this.caps,
            emit: (name, detail) => {
                if (name === 'load') this.busy(false);
                emit(this.host, name, { ...detail, renderer: this.renderer && this.renderer.name });
            },
            fail: (reason) => this.fail(reason),
        };
    }

    async start() {
        if (this.destroyed || this.instance) return;
        if (!this.o.src && this.o.renderer !== 'fallback' && !this.o.turntable.length && !this.o.poster) {
            return this.fail('no_model');
        }
        this.busy(true);
        this.renderer = pickRenderer(this.o.renderer, this.caps);
        try {
            this.instance = await this.renderer.mount(this.stage, this.o, this.ctx());
        } catch (err) {
            if (this.renderer === fallback) return this.fail(err && err.message);
            // The 3D engine could not start: show the fallback instead of an empty box.
            emit(this.host, 'renderer-fallback', { from: this.renderer.name, reason: err && err.message });
            this.renderer = fallback;
            this.instance = await fallback.mount(this.stage, this.o, this.ctx());
        }
        if (this.destroyed) return this.destroy();
        emit(this.host, 'ready', { renderer: this.renderer.name, modelViewer: this.modelViewer() });
        this.runFeatures();
        // A module loaded later (e.g. the Pro script) joins the viewers already on the page.
        const added = (e) => this.runFeatures([e.detail.name]);
        document.addEventListener('atlasar:feature-added', added);
        this.listeners.push(() => document.removeEventListener('atlasar:feature-added', added));
        return undefined;
    }

    modelViewer() {
        return this.renderer && this.renderer.name === 'model-viewer' && this.instance ? this.instance.element : null;
    }

    /** The API feature modules get (features.js). */
    runFeatures(only = null) {
        const own = [];
        const api = {
            host: this.host,
            options: Object.freeze({ ...this.o }),
            renderer: this.renderer.name,
            modelViewer: this.modelViewer(),
            box: this.box,
            on: (name, fn) => {
                const type = `atlasar:${name}`;
                this.host.addEventListener(type, fn);
                own.push(() => this.host.removeEventListener(type, fn));
            },
            addStyles,
            expose: (name, fn) => {
                // Only new names: a feature can never replace a built-in element method.
                if (typeof name !== 'string' || typeof fn !== 'function') return;
                if (name in this.host && !Object.hasOwn(this.host, name)) return;
                this.host[name] = fn;
                own.push(() => { if (this.host[name] === fn) delete this.host[name]; });
            },
            emit: (name, detail) => emit(this.host, name, detail),
        };
        const done = setupFeatures(api, only);
        const previous = this.teardown;
        this.teardown = () => {
            if (previous) previous();
            done();
            for (const off of own.splice(0)) off();
        };
    }

    fail(reason) {
        this.busy(false);
        this.overlay.replaceChildren(el('p', { class: 'atlasar-error', role: 'alert' }, this.o.strings.loadFailed));
        emit(this.host, 'error', { reason: reason || 'unknown' });
    }

    update(options) {
        this.o = options;
        this.layout();
        if (this.instance) {
            this.instance.update(options);
            // Features see the new options: run them again.
            if (this.teardown) { this.teardown(); this.teardown = null; }
            this.runFeatures();
        }
    }

    destroy() {
        this.destroyed = true;
        if (this.observer) this.observer.disconnect();
        if (this.teardown) this.teardown();
        this.teardown = null;
        for (const off of this.listeners.splice(0)) off();
        if (this.instance) this.instance.destroy();
        this.instance = null;
        this.box.remove();
    }
}
