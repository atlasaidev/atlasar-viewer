/**
 * AR-109: the model-viewer renderer (WebGL). Maps the options the AtlasAR WordPress plugin offers
 * (src/context/utilities.js setModelAttributes) onto <model-viewer>, plus the custom AR button
 * with its colours applied (the plugin saves those colours but never applied them).
 *
 * Renderer contract (see renderers/index.js): { name, supported(caps), mount(stage, o, ctx) }
 * → Promise<{ element, update(o), destroy() }>.
 */
import { loadModelViewer } from '../assets.js';
import { el } from '../dom.js';

function setBool(node, name, on) {
    if (on) node.setAttribute(name, '');
    else node.removeAttribute(name);
}
function setOpt(node, name, value) {
    if (value === '' || value === null || value === undefined) node.removeAttribute(name);
    else node.setAttribute(name, String(value));
}

function apply(mv, o) {
    setOpt(mv, 'src', o.src);
    setOpt(mv, 'ios-src', o.iosSrc);
    setOpt(mv, 'poster', o.poster);
    setOpt(mv, 'alt', o.alt);

    setOpt(mv, 'environment-image', o.environmentImage);
    setOpt(mv, 'skybox-image', o.skyboxImage);
    setOpt(mv, 'tone-mapping', o.toneMapping);
    setOpt(mv, 'exposure', o.exposure);
    setOpt(mv, 'shadow-intensity', o.shadowIntensity);
    setBool(mv, 'auto-rotate', o.autoRotate);
    setOpt(mv, 'camera-orbit', o.cameraOrbit);
    setBool(mv, 'camera-controls', o.cameraControls);
    setBool(mv, 'disable-zoom', o.disableZoom);
    setBool(mv, 'disable-tap', o.disableTap);
    setOpt(mv, 'interaction-prompt', o.interactionPrompt);
    setOpt(mv, 'interaction-prompt-threshold', o.interactionPromptThreshold);
    setOpt(mv, 'loading', o.loading);
    setOpt(mv, 'reveal', o.reveal);

    setBool(mv, 'ar', o.ar);
    setOpt(mv, 'ar-modes', o.ar ? o.arModes.join(' ') : '');
    setOpt(mv, 'ar-placement', o.arPlacement);
    setOpt(mv, 'ar-scale', o.arScale);
    setBool(mv, 'xr-environment', o.ar && o.xrEnvironment);

    mv.style.backgroundColor = o.background;
}

function arButton(o) {
    if (o.arButton === 'none') return el('span', { slot: 'ar-button', hidden: true });
    if (o.arButton !== 'custom') return null; // model-viewer's own AR button
    const button = el('button', { type: 'button', slot: 'ar-button', class: 'atlasar-ar-button' }, [
        el('span', { class: 'atlasar-icon atlasar-icon-cube', 'aria-hidden': 'true' }),
        el('span', {}, o.arButtonText),
    ]);
    button.style.backgroundColor = o.arButtonBackground;
    button.style.color = o.arButtonColor;
    return button;
}

export default {
    name: 'model-viewer',
    supported: (caps) => caps.modelViewer,

    async mount(stage, o, ctx) {
        await loadModelViewer();
        const mv = document.createElement('model-viewer');
        mv.className = ['atlasar-model-viewer', o.viewerClass].filter(Boolean).join(' ');
        if (o.viewerId) mv.id = o.viewerId;
        apply(mv, o);
        const custom = arButton(o);
        if (custom) mv.append(custom);
        const status = el('div', { class: 'atlasar-ar-status', role: 'status', hidden: true });
        mv.append(status);

        const onLoad = () => ctx.emit('load', { modelViewer: mv });
        const onError = (e) => ctx.fail(e && e.detail && e.detail.type ? `model-viewer: ${e.detail.type}` : 'model_error');
        const onAr = (e) => {
            const s = e.detail && e.detail.status;
            ctx.emit('ar-status', { status: s });
            status.hidden = s !== 'failed';
            status.textContent = s === 'failed' ? o.strings.arNotTracking : '';
        };
        // reveal="manual": the poster stays until the visitor taps it.
        const onTap = () => { if (o.reveal === 'manual' && typeof mv.dismissPoster === 'function') mv.dismissPoster(); };
        mv.addEventListener('load', onLoad);
        mv.addEventListener('error', onError);
        mv.addEventListener('ar-status', onAr);
        mv.addEventListener('click', onTap);
        stage.append(mv);

        return {
            element: mv,
            update(next) {
                o = next;
                apply(mv, next);
                const old = mv.querySelector('[slot="ar-button"]');
                if (old) old.remove();
                const btn = arButton(next);
                if (btn) mv.append(btn);
            },
            destroy() {
                mv.removeEventListener('load', onLoad);
                mv.removeEventListener('error', onError);
                mv.removeEventListener('ar-status', onAr);
                mv.removeEventListener('click', onTap);
                mv.remove();
            },
        };
    },
};
