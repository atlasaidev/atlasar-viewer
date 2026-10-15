/**
 * AR-109: on a computer, a "View on your phone" button that shows a QR code of the page, so the
 * visitor can open it on a phone and use AR (plugin: ar_try_on_enable_qr_code). Never on phones.
 */
import qrcode from '../vendor/qrcode-generator.min.cjs';
import { el } from './dom.js';

export function qrDataUrl(text) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createDataURL(6, 2);
}

/** The button and its panel, inside the viewer box. */
export function qrControl(o) {
    const s = o.strings;
    const panel = el('div', { class: 'atlasar-qr-panel', role: 'dialog', 'aria-label': s.qrTitle, hidden: '' });
    const button = el('button', { type: 'button', class: 'atlasar-qr-button', 'aria-expanded': 'false', title: s.qrButton }, [
        el('span', { class: 'atlasar-icon atlasar-icon-phone', 'aria-hidden': 'true' }),
        el('span', { class: 'atlasar-qr-button-text' }, s.qrButton),
    ]);
    let built = false;
    const close = () => {
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
    };
    button.addEventListener('click', () => {
        if (!built) {
            built = true;
            const closeBtn = el('button', { type: 'button', class: 'atlasar-qr-close', 'aria-label': s.close }, '×');
            closeBtn.addEventListener('click', () => { close(); button.focus(); });
            panel.append(
                closeBtn,
                el('p', { class: 'atlasar-qr-title' }, s.qrTitle),
                el('img', { class: 'atlasar-qr-image', alt: s.qrTitle, width: '180', height: '180', src: qrDataUrl(o.qrUrl || location.href) }),
                el('p', { class: 'atlasar-qr-help' }, s.qrHelp),
                o.qrBrand ? el('p', { class: 'atlasar-qr-brand' }, o.qrBrand) : null,
            );
        }
        const open = panel.hidden;
        panel.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
    });
    panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); button.focus(); } });
    return el('div', { class: 'atlasar-qr' }, [button, panel]);
}
