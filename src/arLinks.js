/**
 * AR-109: AR without WebGL. Android's Scene Viewer and iOS Quick Look are apps of the phone
 * itself, opened by a link, so they work even where the page cannot draw 3D.
 */

/** Android Scene Viewer (Google app), with the page as the fallback when it is not installed. */
export function sceneViewerUrl(o) {
    if (!o.src) return '';
    const file = new URL(o.src, document.baseURI).href;
    const params = new URLSearchParams({ file, mode: 'ar_preferred' });
    if (o.title || o.alt) params.set('title', o.title || o.alt);
    if (o.arScale === 'fixed') params.set('resizable', 'false');
    if (o.arPlacement === 'wall') params.set('enable_vertical_placement', 'true');
    const fallback = encodeURIComponent(location.href);
    return `intent://arvr.google.com/scene-viewer/1.2?${params.toString()}`
        + `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end;`;
}

/** iOS Quick Look needs a USDZ file (model-viewer can only make one from the GLB with WebGL). */
export function quickLookUrl(o) {
    if (!o.iosSrc) return '';
    const url = new URL(o.iosSrc, document.baseURI);
    if (o.arScale === 'fixed') url.hash = 'allowsContentScaling=0';
    return url.href;
}

/**
 * A "View in your room" link for this phone, or null when it has no AR app we can open.
 * Quick Look requires the link to wrap an <img> (Apple's rule), so one is always added.
 */
export function arLink(o, caps, label) {
    let a = null;
    if (caps.iOS && caps.quickLook && o.arModes.includes('quick-look')) {
        const href = quickLookUrl(o);
        if (!href) return null;
        a = document.createElement('a');
        a.rel = 'ar';
        a.href = href;
    } else if (caps.android && o.arModes.includes('scene-viewer')) {
        const href = sceneViewerUrl(o);
        if (!href) return null;
        a = document.createElement('a');
        a.href = href;
    }
    if (!a) return null;
    a.className = 'atlasar-ar-link';
    const img = document.createElement('img');
    img.alt = '';
    img.src = o.poster || 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    img.className = 'atlasar-ar-link-img';
    const text = document.createElement('span');
    text.textContent = label;
    a.append(img, text);
    return a;
}
