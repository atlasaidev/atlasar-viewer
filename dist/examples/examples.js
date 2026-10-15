/* AR-109: the example page (no inline scripts, so it runs under a strict CSP too). */
(function () {
    const q = new URLSearchParams(location.search);
    const model = q.get('model') || '';
    const src = q.get('src') || '';
    const poster = q.get('poster') || '';
    const set = (node) => {
        if (model) node.setAttribute('model', model);
        if (src) node.setAttribute('src', src);
        if (poster) node.setAttribute('poster', poster);
    };
    document.querySelectorAll('atlasar-viewer.demo').forEach(set);
    const img = document.querySelector('.no-js-fallback');
    if (img) { if (poster) img.src = poster; else img.remove(); }

    const log = document.getElementById('events');
    const write = (text) => { log.textContent = text; };
    document.addEventListener('atlasar:error', (e) => write(`atlasar:error — ${e.detail.reason}`));

    function fromCode() {
        const opts = { autoRotate: true, height: '360px' };
        if (model) opts.model = model;
        if (src) opts.src = src;
        if (poster) opts.poster = poster;
        const viewer = window.AtlasAR.mount('#from-code', opts);
        viewer.element.addEventListener('atlasar:ready', (e) => write(`atlasar:ready — renderer: ${e.detail.renderer}`));
        viewer.element.addEventListener('atlasar:load', () => write(`${log.textContent} · atlasar:load`));
    }
    if (window.AtlasAR) fromCode();
    else document.addEventListener('atlasar:sdk-ready', fromCode, { once: true });
}());
