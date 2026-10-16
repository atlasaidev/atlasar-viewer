/**
 * AR-111: one try-on session (plugin: tryon-controller.js): consent → front camera → face
 * tracker in a worker → each frame: the mirrored camera picture plus the accessory, either the
 * Free 2D overlay or the Premium renderer (pipeline.render). Snapshots download in the browser
 * only (no upload); Free adds "Powered by AtlasAR". Everything stops when the window closes.
 */
import { addStyles } from '../features.js';
import { setBase } from '../assets.js';
import { createUI, CSS } from './ui.js';
import { productSprite } from './sprite.js';

/**
 * The worker comes from AtlasAR Cloud, another origin than the shop: browsers only start
 * same-origin worker scripts, so a tiny blob: module imports it (needs CSP worker-src blob:).
 */
function startWorker(assetsBase) {
    const url = `${assetsBase}tryon-worker.js`;
    const boot = URL.createObjectURL(new Blob([`import ${JSON.stringify(url)};`], { type: 'text/javascript' }));
    try {
        return new Worker(boot, { type: 'module' });
    } finally {
        setTimeout(() => URL.revokeObjectURL(boot), 10000);
    }
}

function watermarked(src, watermark, hd) {
    const scale = hd ? 2 : 1;
    if (!watermark && scale === 1) return src.toDataURL('image/png');
    const out = document.createElement('canvas');
    out.width = src.width * scale;
    out.height = src.height * scale;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, out.width, out.height);
    if (watermark) {
        const text = 'Powered by AtlasAR';
        const size = Math.max(11, Math.round(out.width * 0.022));
        ctx.font = `600 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
        const w = ctx.measureText(text).width + 20;
        const h = size + 12;
        const x = out.width - w - 10;
        const y = out.height - h - 10;
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, 8); else ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + 10, y + h / 2);
    }
    return out.toDataURL('image/png');
}

/**
 * @param {{ options, category, assetsBase, pipeline, returnFocus, emit }} args
 *   category: the registered try-on category (registry.js) — where the product sits on the body
 */
export async function start({ options: o, category, assetsBase, pipeline, returnFocus, emit }) {
    setBase(`${assetsBase}atlasar.js`); // this bundle's own copy of the asset paths
    addStyles('atlasar-tryon', CSS, 'atlasar.css');
    const s = o.strings;
    const p = pipeline || {};
    const ui = createUI(o, { returnFocus });
    // The Premium 3D renderer knows two shapes (glasses, hat); every category maps to one of them.
    const accessory = category.kind;
    const mode = `face-${accessory}`;
    emit('tryon-open', { accessory, category: category.name });

    if (!window.isSecureContext) return ui.showError(s.tryonInsecure);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof Worker !== 'function' || typeof createImageBitmap !== 'function') {
        return ui.showError(s.tryonUnsupported);
    }
    if (!(await ui.askConsent())) return emit('tryon-close', { reason: 'declined' });

    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch {
        return ui.showError(s.tryonDenied);
    }
    if (!ui.isOpen) { stream.getTracks().forEach((t) => t.stop()); return undefined; }

    ui.video.srcObject = stream;
    await ui.video.play().catch(() => {});
    ui.showStage(o.tryonSnapshot);
    ui.setStatus(s.tryonLoading);
    const fit = () => {
        const w = ui.video.videoWidth || 640;
        const h = ui.video.videoHeight || 480;
        if (ui.canvas.width !== w || ui.canvas.height !== h) { ui.canvas.width = w; ui.canvas.height = h; }
    };
    fit();
    ui.video.addEventListener('loadedmetadata', fit);
    window.addEventListener('resize', fit);

    // emit: the pipeline reports through the same events (tryon-calibration-save, tryon-anatomy).
    const ctxInfo = { options: o, mode, accessory, category: category.name, glbSrc: o.src, calibration: o.tryonCalibration || null, anatomy: o.tryonAnatomy || null, emit };
    if (typeof p.tools === 'function') {
        try { p.tools(ui.tools, ctxInfo); ui.tools.hidden = !ui.tools.childNodes.length; } catch (err) { console.warn('[AtlasAR] try-on tools failed', err); }
    }
    const spritePromise = productSprite(o.src);
    const worker = startWorker(assetsBase);
    // AR-115: the tracker files from tryonModels (self-host or a CDN of the same MediaPipe version),
    // else the SDK's own vendor/mediapipe.
    const models = o.tryonModels || {};
    worker.postMessage({
        type: 'init',
        wasmBase: (models.wasmBase || `${assetsBase}vendor/mediapipe`).replace(/\/$/, ''),
        modelUrl: models.face || `${assetsBase}vendor/mediapipe/face_landmarker.task`,
        options: { numFaces: p.numFaces || 1, facialMatrix: !!p.facialMatrix },
    });

    let sprite = null;
    let landmarks = null;
    let facialMatrix = null;
    let ready = false;
    let busy = false;
    let running = true;
    let sawFace = false;
    spritePromise.then((b) => { sprite = b; });
    worker.onmessage = (e) => {
        const m = e.data || {};
        if (m.type === 'ready') { ready = true; ui.setStatus(s.tryonNoFace); emit('tryon-ready', {}); }
        if (m.type === 'result') {
            busy = false;
            landmarks = m.landmarks;
            facialMatrix = m.facialMatrix;
            if (landmarks && !sawFace) { sawFace = true; ui.setStatus(''); }
        }
        if (m.type === 'error') { running = false; ui.showError(s.tryonFailed); emit('error', { reason: `tryon: ${m.message}` }); }
    };
    worker.onerror = (e) => { running = false; ui.showError(s.tryonFailed); emit('error', { reason: `tryon worker: ${e.message || 'failed'}` }); };

    const ctx = ui.canvas.getContext('2d');
    const frame = () => {
        if (!running || !ui.isOpen) return;
        const { width: w, height: h } = ui.canvas;
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1); // selfie view
        ctx.drawImage(ui.video, 0, 0, w, h);
        ctx.restore();
        if (landmarks) {
            let anchor = null;
            if (sprite) {
                try { anchor = category.anchor(landmarks, ui.canvas) || null; } catch (err) { console.warn(`[AtlasAR] try-on category "${category.name}" failed`, err); }
            }
            if (anchor && typeof p.adjustAnchor === 'function') {
                try { anchor = p.adjustAnchor(anchor, ctxInfo) || anchor; } catch { /* keep the default */ }
            }
            let drawn = false;
            if (typeof p.render === 'function') {
                try {
                    drawn = p.render({ ...ctxInfo, ctx, canvas: ui.canvas, video: ui.video, landmarks, facialMatrix, anchor, sprite }) !== false;
                } catch (err) { console.warn('[AtlasAR] try-on renderer failed; using the 2D overlay.', err); }
            }
            if (!drawn && anchor && sprite) {
                const sw = anchor.width;
                const sh = sw * (sprite.height / sprite.width);
                ctx.save();
                ctx.translate(w - anchor.x, anchor.y); // the picture is mirrored, so is x
                ctx.rotate(-anchor.rotation);
                ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh);
                ctx.restore();
            }
        }
        if (ready && !busy && ui.video.readyState >= 2) {
            busy = true;
            createImageBitmap(ui.video)
                .then((bitmap) => worker.postMessage({ type: 'detect', bitmap, ts: performance.now() }, [bitmap]))
                .catch(() => { busy = false; });
        }
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    ui.shutter.addEventListener('click', () => {
        const a = document.createElement('a');
        // The site may set watermark / HD itself (tryonWatermark / tryonHd); otherwise the pipeline decides.
        const watermark = o.tryonWatermark !== null ? o.tryonWatermark : p.watermark !== false;
        const hd = o.tryonHd !== null ? o.tryonHd : !!p.hd;
        a.href = watermarked(ui.canvas, watermark, hd);
        a.download = `tryon-${o.tryonSnapshotName ? `${o.tryonSnapshotName}-` : ''}${Date.now()}.png`;
        document.body.append(a);
        a.click();
        a.remove();
        emit('tryon-snapshot', {});
    });

    ui.onClose = () => {
        running = false;
        stream.getTracks().forEach((t) => t.stop());
        worker.postMessage({ type: 'dispose' });
        worker.terminate();
        window.removeEventListener('resize', fit);
        if (typeof p.dispose === 'function') { try { p.dispose(); } catch { /* ignore */ } }
        emit('tryon-close', {});
    };
    return ui;
}
