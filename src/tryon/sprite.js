/**
 * AR-111: the Free try-on draws the product as a flat picture: an off-screen <model-viewer>
 * renders it front-on, toBlob() makes the picture, and the transparent border is trimmed so the
 * size rules fit every model (plugin: captureProductSprite + trimSpriteAlpha).
 */
import { loadModelViewer } from '../assets.js';

async function trim(bitmap) {
    try {
        const { width: w, height: h } = bitmap;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bitmap, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data;
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 8) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) return bitmap;
        return await createImageBitmap(bitmap, minX, minY, maxX - minX + 1, maxY - minY + 1);
    } catch {
        return bitmap;
    }
}

/** The product as an ImageBitmap seen from the front, or null. */
export async function productSprite(src) {
    if (!src) return null;
    await loadModelViewer();
    const mv = document.createElement('model-viewer');
    // Must be in the viewport to render; clip-path keeps it invisible.
    Object.assign(mv.style, { position: 'fixed', top: '0', right: '0', width: '512px', height: '512px', clipPath: 'inset(0 0 100% 100%)', pointerEvents: 'none' });
    mv.setAttribute('aria-hidden', 'true');
    for (const [k, v] of Object.entries({ src, 'camera-orbit': '0deg 90deg auto', exposure: '1', 'shadow-intensity': '0', 'environment-image': 'neutral', loading: 'eager', reveal: 'auto' })) mv.setAttribute(k, v);
    document.body.append(mv);
    try {
        const ok = await new Promise((resolve) => {
            const t = setTimeout(() => resolve(false), 15000);
            mv.addEventListener('load', () => { clearTimeout(t); resolve(true); }, { once: true });
            mv.addEventListener('error', () => { clearTimeout(t); resolve(false); }, { once: true });
        });
        if (!ok || typeof mv.toBlob !== 'function') return null;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const blob = await mv.toBlob({ mimeType: 'image/png', idealAspect: false });
        return blob ? trim(await createImageBitmap(blob)) : null;
    } catch {
        return null;
    } finally {
        mv.remove();
    }
}
