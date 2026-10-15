/**
 * AR-109: the renderer for browsers that cannot draw 3D (no WebGL, no custom elements or ES
 * modules). It never shows an empty box:
 *   - 360° images (options.turntable) the visitor turns by dragging or with the arrow keys,
 *     else the poster image;
 *   - "View in your room": the phone's own AR app (Scene Viewer / Quick Look) by a plain link,
 *     which needs no WebGL;
 *   - a short note that this browser cannot show 3D.
 */
import { arLink } from '../arLinks.js';
import { el } from '../dom.js';

function turntable(frames, o) {
    let index = 0;
    const img = el('img', { class: 'atlasar-turntable-image', src: frames[0], alt: o.alt, draggable: 'false' });
    const box = el('div', {
        class: 'atlasar-turntable', role: 'slider', tabindex: '0',
        'aria-label': `${o.alt}. ${o.strings.dragToTurn}`,
        'aria-valuemin': '0', 'aria-valuemax': String(frames.length - 1), 'aria-valuenow': '0',
    }, [img, el('span', { class: 'atlasar-turntable-hint', 'aria-hidden': 'true' }, o.strings.dragToTurn)]);
    const loaded = new Set([0]);
    const show = (i) => {
        index = ((i % frames.length) + frames.length) % frames.length;
        img.src = frames[index];
        box.setAttribute('aria-valuenow', String(index));
        // Load the neighbours ahead of time, so turning feels smooth.
        for (const n of [index + 1, index - 1]) {
            const k = ((n % frames.length) + frames.length) % frames.length;
            if (!loaded.has(k)) { loaded.add(k); new Image().src = frames[k]; }
        }
    };
    let startX = null;
    let startIndex = 0;
    box.addEventListener('pointerdown', (e) => {
        startX = e.clientX;
        startIndex = index;
        box.setPointerCapture(e.pointerId);
    });
    box.addEventListener('pointermove', (e) => {
        if (startX === null) return;
        const step = Math.max(4, box.clientWidth / frames.length / 1.5);
        show(startIndex - Math.round((e.clientX - startX) / step));
    });
    const end = () => { startX = null; };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
    box.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { show(index - 1); e.preventDefault(); }
        if (e.key === 'ArrowRight') { show(index + 1); e.preventDefault(); }
        if (e.key === 'Home') { show(0); e.preventDefault(); }
    });
    return box;
}

function render(stage, o, ctx) {
    const parts = [];
    if (o.turntable.length > 1) parts.push(turntable(o.turntable, o));
    else if (o.poster || o.turntable[0]) parts.push(el('img', { class: 'atlasar-fallback-image', src: o.poster || o.turntable[0], alt: o.alt }));
    if (o.ar) {
        const link = arLink(o, ctx.caps, o.strings.viewInYourRoom);
        if (link) {
            link.addEventListener('click', () => ctx.emit('ar-status', { status: 'session-started', via: 'link' }));
            parts.push(link);
        }
    }
    parts.push(el('p', { class: 'atlasar-fallback-note' }, o.strings.unsupported));
    const root = el('div', { class: 'atlasar-fallback' }, parts);
    stage.append(root);
    return root;
}

export default {
    name: 'fallback',
    supported: () => true,

    async mount(stage, o, ctx) {
        let root = render(stage, o, ctx);
        ctx.emit('load', { modelViewer: null, renderer: 'fallback' });
        return {
            element: root,
            update(next) {
                root.remove();
                root = render(stage, next, ctx);
            },
            destroy() { root.remove(); },
        };
    },
};
