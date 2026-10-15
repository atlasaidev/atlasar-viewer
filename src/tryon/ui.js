/**
 * AR-111: the try-on window (plugin: tryon-ui.js), rebuilt with the DOM API: a consent step that
 * really shows the consent text (the plugin passed it but never showed it), the mirrored camera
 * canvas, a shutter button, status and errors. A native <dialog>: Esc closes, focus stays inside,
 * and focus returns to the "Try it on" button afterwards.
 */
import { el } from '../dom.js';

export const CSS = `
.atlasar-tryon{width:min(720px,calc(100vw - 24px));max-height:calc(100vh - 24px);padding:0;border:0;border-radius:14px;background:#111;color:#fff;overflow:hidden}
.atlasar-tryon::backdrop{background:rgba(0,0,0,.7)}
.atlasar-tryon-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 10px 16px}
.atlasar-tryon-title{margin:0;font-size:16px;font-weight:600}
.atlasar-tryon-x{width:40px;height:40px;border:0;border-radius:8px;background:transparent;color:#fff;font-size:24px;cursor:pointer}
.atlasar-tryon-x:focus-visible,.atlasar-tryon button:focus-visible{outline:2px solid #fff;outline-offset:2px}
.atlasar-tryon-stage{position:relative;background:#000;display:flex;align-items:center;justify-content:center;min-height:240px}
.atlasar-tryon-canvas{display:block;width:100%;height:auto;max-height:calc(100vh - 140px);object-fit:contain}
.atlasar-tryon-video{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.atlasar-tryon-status{position:absolute;left:50%;top:14px;transform:translateX(-50%);padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.6);font-size:13px}
.atlasar-tryon-status:empty{display:none}
.atlasar-tryon-shutter{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:64px;height:64px;border:4px solid #fff;border-radius:50%;background:rgba(255,255,255,.25);cursor:pointer}
.atlasar-tryon-consent{padding:20px 16px;text-align:center}
.atlasar-tryon-consent p{margin:0 0 16px;font-size:15px;line-height:1.5;color:#e5e7eb}
.atlasar-tryon-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.atlasar-tryon-allow,.atlasar-tryon-cancel{min-height:44px;padding:10px 18px;border-radius:999px;font:inherit;font-weight:600;cursor:pointer}
.atlasar-tryon-allow{border:0;background:#fff;color:#111}
.atlasar-tryon-cancel{border:1px solid rgba(255,255,255,.5);background:transparent;color:#fff}
.atlasar-tryon-error{margin:0;padding:16px;background:#7f1d1d;color:#fff;font-size:14px}
.atlasar-tryon-tools{padding:10px 14px;background:#1f2937}
@media (max-width:600px){.atlasar-tryon{width:100vw;max-height:100vh;height:100vh;border-radius:0}}
`;

export function createUI(o, { returnFocus } = {}) {
    const s = o.strings;
    const native = typeof HTMLDialogElement === 'function';
    const video = el('video', { class: 'atlasar-tryon-video', playsinline: true, muted: true, autoplay: true, 'aria-hidden': 'true' });
    video.muted = true;
    const canvas = el('canvas', { class: 'atlasar-tryon-canvas', role: 'img', 'aria-label': s.tryonTitle });
    const status = el('div', { class: 'atlasar-tryon-status', role: 'status', 'aria-live': 'polite' });
    const shutter = el('button', { type: 'button', class: 'atlasar-tryon-shutter', 'aria-label': s.tryonSnapshot, title: s.tryonSnapshot, hidden: true });
    const stage = el('div', { class: 'atlasar-tryon-stage', hidden: true }, [video, canvas, status, shutter]);
    const allow = el('button', { type: 'button', class: 'atlasar-tryon-allow' }, s.tryonAllow);
    const cancel = el('button', { type: 'button', class: 'atlasar-tryon-cancel' }, s.tryonCancel);
    const consent = el('div', { class: 'atlasar-tryon-consent' }, [
        el('p', {}, o.tryonConsent || s.tryonConsent),
        el('div', { class: 'atlasar-tryon-actions' }, [allow, cancel]),
    ]);
    const error = el('p', { class: 'atlasar-tryon-error', role: 'alert', hidden: true });
    const tools = el('div', { class: 'atlasar-tryon-tools', hidden: true });
    const x = el('button', { type: 'button', class: 'atlasar-tryon-x', 'aria-label': s.tryonClose, title: s.tryonClose }, '×');
    const root = el(native ? 'dialog' : 'div', { class: 'atlasar-tryon', 'aria-label': s.tryonTitle, ...(native ? {} : { role: 'dialog', 'aria-modal': 'true' }) }, [
        el('div', { class: 'atlasar-tryon-head' }, [el('h2', { class: 'atlasar-tryon-title' }, s.tryonTitle), x]),
        consent, stage, tools, error,
    ]);

    let open = true;
    let consentAnswer = null;
    let onClose = null;
    const answer = (yes) => { if (consentAnswer) { const r = consentAnswer; consentAnswer = null; r(yes); } };
    const close = () => {
        if (!open) return;
        open = false;
        answer(false);
        if (native && root.open) root.close();
        root.remove();
        document.documentElement.classList.remove('atlasar-popup-open');
        if (onClose) onClose();
        if (returnFocus && returnFocus.isConnected) returnFocus.focus();
    };
    x.addEventListener('click', close);
    cancel.addEventListener('click', close);
    allow.addEventListener('click', () => answer(true));
    if (native) {
        root.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
        root.addEventListener('close', close);
    } else {
        root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }
    document.body.append(root);
    document.documentElement.classList.add('atlasar-popup-open'); // the page behind stops scrolling
    if (native) root.showModal();
    allow.focus();

    return {
        root, video, canvas, shutter, tools,
        get isOpen() { return open; },
        askConsent: () => new Promise((resolve) => { consentAnswer = resolve; }),
        showStage(snapshots) {
            consent.hidden = true;
            stage.hidden = false;
            shutter.hidden = !snapshots;
            x.focus();
        },
        setStatus(text) { status.textContent = text || ''; },
        showError(text) {
            consent.hidden = true;
            error.textContent = text;
            error.hidden = false;
            x.focus();
        },
        close,
        set onClose(fn) { onClose = fn; },
    };
}
