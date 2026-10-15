/**
 * AR-109: tiny DOM helpers. Text is always set as text (never HTML), and no inline event handlers
 * are ever written, so the SDK works under a strict Content-Security-Policy.
 */

/** el('button', { class: 'x', type: 'button' }, ['text', child, null]) */
export function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        node.setAttribute(k, v === true ? '' : String(v));
    }
    for (const child of [].concat(children)) {
        if (child === null || child === undefined || child === false) continue;
        node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
}

/** Fire an event on the viewer element (bubbles, so a page can listen on document). */
export function emit(target, name, detail = {}) {
    target.dispatchEvent(new CustomEvent(`atlasar:${name}`, { bubbles: true, composed: true, detail }));
}
