/**
 * AR-109: what this browser can do, checked once. The renderer is chosen from this, so a browser
 * without WebGL (old phones, locked-down kiosks, some privacy modes) still gets a poster, 360°
 * images and direct AR links instead of an empty box.
 */

let cached = null;

function webgl() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return false;
        // A context that is lost at once (blocked GPU) is no context.
        return typeof gl.isContextLost !== 'function' || !gl.isContextLost();
    } catch {
        return false;
    }
}

export function capabilities() {
    if (cached) return cached;
    const ua = navigator.userAgent || '';
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    let quickLook = false;
    try {
        quickLook = document.createElement('a').relList.supports('ar');
    } catch { /* old browsers: no relList */ }
    cached = {
        customElements: 'customElements' in window,
        modules: 'noModule' in HTMLScriptElement.prototype,
        webgl: webgl(),
        iOS,
        android,
        mobile: iOS || android || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(hover: hover)').matches),
        quickLook,
        intersectionObserver: 'IntersectionObserver' in window,
        fullscreen: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
        dialog: typeof HTMLDialogElement === 'function',
        reducedMotion: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    };
    // model-viewer 3.x needs custom elements, ES modules and WebGL.
    cached.modelViewer = cached.customElements && cached.modules && cached.webgl;
    return cached;
}

/** For tests: forget the cached result. */
export function resetCapabilities() {
    cached = null;
}
