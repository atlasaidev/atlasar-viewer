/**
 * AR-109: the viewer's options — defaults (the AtlasAR WordPress plugin's own defaults), the
 * mapping from <atlasar-viewer> attributes, and validation. Options come from, lowest first:
 * defaults → the AtlasAR Cloud model (when `model` is set) → attributes → options passed in code.
 */
import { category } from './tryon/registry.js';

export const DEFAULTS = Object.freeze({
    // What to show: an AtlasAR Cloud model id, or your own file URLs.
    model: '',
    src: '',
    iosSrc: '',
    poster: '',
    alt: '3D model',

    // Viewer (plugin: per-product viewer settings).
    environmentImage: 'neutral',
    skyboxImage: '',
    toneMapping: 'neutral',
    exposure: 1,
    shadowIntensity: 1,
    autoRotate: false,
    cameraOrbit: '45deg 55deg 4m',
    cameraControls: true,
    disableZoom: false,
    disableTap: false,
    interactionPrompt: 'auto',
    interactionPromptThreshold: 2000,
    background: 'transparent',

    // Size and layout (plugin: canvas_*).
    width: '100%',
    height: '400px',
    align: 'left',
    margin: '0',
    padding: '2px 0',
    css: '',

    // AR (plugin: ar_try_on_ar*, ar_placement).
    ar: true,
    arModes: ['webxr', 'scene-viewer', 'quick-look'],
    arPlacement: 'floor',
    arScale: 'auto',
    xrEnvironment: true,
    arButton: 'default',
    arButtonText: 'View in AR',
    arButtonBackground: '#3a3a3a',
    arButtonColor: '#ffffff',
    qr: true,
    qrUrl: '',
    qrBrand: 'AtlasAR',

    // Display (plugin: inline viewer, or the "View in 3D" button with a popup).
    display: 'inline',
    buttonLabel: 'View in 3D',
    title: '',

    // Loading (plugin: model_load_strategy, ar_try_on_loading_type, ar_try_on_reveal_type).
    load: 'visible',
    loading: 'auto',
    reveal: 'auto',

    // Which engine draws the model: 'auto' picks the best one this browser supports
    // (model-viewer needs WebGL); 'fallback' is the poster / 360° images with direct AR links.
    renderer: 'auto',
    // 360° images (one per angle, in order) for browsers that cannot show 3D.
    turntable: [],

    // AR-114: an id and extra classes for the inner <model-viewer> (the WordPress plugin keeps its
    // old ids and its atlas_ar_model_viewer class, so existing CSS and scripts still find it).
    viewerId: '',
    viewerClass: '',

    // Where the SDK's files and the AtlasAR Cloud API live (set automatically from the script URL).
    assetsBase: '',
    apiBase: '',

    // Virtual try-on with the camera (plugin: ar_placement face-glasses / face-hat). Free: the 2D
    // overlay with a watermark on snapshots; Premium (atlasar-pro.js): 3D head pose, no watermark.
    tryon: '',
    tryonLabel: 'Try it on',
    tryonSnapshot: true,
    tryonConsent: '',
    tryonCalibration: null,
    tryonCalibrate: false,
    // AR-115: where the face tracker files are ({ face, wasmBase }; default: the SDK's vendor/mediapipe),
    // snapshot overrides (null = the pipeline decides), a cached model measurement (Premium 3D),
    // the snapshot file name and the try-on button colour.
    tryonModels: null,
    tryonWatermark: null,
    tryonHd: null,
    tryonAnatomy: null,
    tryonSnapshotName: '',
    tryonAccent: '',

    // Premium modules' data (atlasar-pro.js reads and checks it; the core only passes it on).
    // Attributes take JSON, e.g. hotspots='[{"position":"0 1 0","label":"Seat"}]'.
    hotspots: [],
    dimensions: null,
    items: [],
    variants: null,
    variant: '',

    // AR-112: set from the AtlasAR Cloud model (true / false); null for your own files. false turns
    // the Premium modules and the Premium try-on off for this viewer (the site's plan is Free).
    premium: null,

    // Every visible text, for translation.
    strings: null,
});

export const STRINGS = Object.freeze({
    viewIn3d: 'View in 3D',
    loading: 'Loading 3D model',
    unsupported: '3D viewing is not supported in this browser.',
    dragToTurn: 'Drag to turn the product',
    models: 'Models',
    showModel: 'Show',
    hotspot: 'Point of interest',
    tryonTitle: 'Virtual try-on',
    tryonConsent: 'Allow camera access to try this product on. The video stays on your device: nothing is recorded or sent.',
    tryonAllow: 'Allow camera access',
    tryonCancel: 'Cancel',
    tryonLoading: 'Loading the face tracker…',
    tryonNoFace: 'Look at the camera',
    tryonDenied: 'The camera could not be opened. Allow camera access for this site in your browser settings, then try again.',
    tryonInsecure: 'The camera needs a secure (https) page.',
    tryonUnsupported: 'This browser cannot run the virtual try-on.',
    tryonFailed: 'The try-on could not start. Please try again.',
    tryonSnapshot: 'Take a photo',
    tryonClose: 'Close try-on',
    viewInYourRoom: 'View in your room',
    loadFailed: 'The 3D model could not be loaded.',
    close: 'Close',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    qrButton: 'View on your phone',
    qrTitle: 'View in AR on your phone',
    qrHelp: 'Scan this code with your phone camera to see the product in your room.',
    dialogLabel: '3D model viewer',
    arNotTracking: 'AR is not tracking. Move your phone slowly and point it at the floor.',
});

const ENUMS = {
    environmentImage: null, // any URL or 'neutral' / 'legacy'
    toneMapping: ['neutral', 'aces', 'agx', 'reinhard', 'cineon', 'linear', 'commerce'],
    interactionPrompt: ['auto', 'none'],
    align: ['left', 'center', 'right'],
    arPlacement: ['floor', 'wall'],
    arScale: ['auto', 'fixed'],
    arButton: ['default', 'custom', 'none'],
    display: ['inline', 'popup'],
    load: ['visible', 'interaction', 'immediate'],
    loading: ['auto', 'lazy', 'eager'],
    reveal: ['auto', 'manual'],
    tryon: null, // AR-115: any registered category (tryon/registry.js); checked when the button is drawn
    renderer: ['auto', 'model-viewer', 'fallback'],
};
const AR_MODES = ['webxr', 'scene-viewer', 'quick-look'];
const BOOLEANS = ['autoRotate', 'cameraControls', 'disableZoom', 'disableTap', 'ar', 'xrEnvironment', 'qr', 'tryonSnapshot', 'tryonCalibrate'];
const NUMBERS = { exposure: [0, 10], shadowIntensity: [0, 10], interactionPromptThreshold: [0, 600000] };

/** Attribute name for an option: iosSrc → ios-src. */
export const attrName = (key) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
/** Every attribute <atlasar-viewer> reads. */
export const ATTRIBUTES = Object.keys(DEFAULTS).filter((k) => k !== 'strings' && k !== 'turntable').map(attrName).concat('turntable');

function toBool(v) {
    if (typeof v === 'boolean') return v;
    const s = String(v).trim().toLowerCase();
    return !(s === 'false' || s === '0' || s === 'no' || s === 'off');
}

/** Options from an element's attributes (only the ones present). */
export function fromAttributes(el) {
    const out = {};
    for (const key of Object.keys(DEFAULTS)) {
        if (key === 'strings') continue;
        const name = attrName(key);
        if (!el.hasAttribute(name)) continue;
        out[key] = el.getAttribute(name);
    }
    return out;
}

/** A safe CSS length/value: no braces, semicolons, url() or expressions (it goes into style properties). */
const cssValue = (v, fallback) => {
    const s = String(v ?? '').trim();
    return s && s.length <= 100 && !/[;{}<>\\]|url\(|expression\(/i.test(s) ? s : fallback;
};
/** http(s), relative or data:/blob: URLs only (never javascript:). */
const safeUrl = (v) => {
    const s = String(v ?? '').trim();
    if (!s) return '';
    try {
        const u = new URL(s, document.baseURI);
        return ['http:', 'https:', 'blob:', 'data:'].includes(u.protocol) ? u.href : '';
    } catch {
        return '';
    }
};

function parsed(v) {
    if (typeof v !== 'string') return v;
    const s = v.trim();
    if (!s || s.length > 100000) return null;
    try { return JSON.parse(s); } catch { return null; }
}
const list = (v, max) => { const p = parsed(v); return Array.isArray(p) ? p.slice(0, max) : []; };
const object = (v) => { const p = parsed(v); return p && typeof p === 'object' && !Array.isArray(p) ? p : null; };

/**
 * Merge and clean options. Unknown keys are ignored; bad values fall back to the default, so a
 * typo never breaks the page.
 */
export function normalize(...layers) {
    const raw = Object.assign({}, DEFAULTS, ...layers.filter(Boolean).map((l) => {
        const clean = {};
        for (const [k, v] of Object.entries(l)) if (v !== undefined && v !== null && Object.hasOwn(DEFAULTS, k)) clean[k] = v;
        return clean;
    }));
    const o = { ...raw };
    for (const k of BOOLEANS) o[k] = toBool(raw[k]);
    for (const [k, [min, max]] of Object.entries(NUMBERS)) {
        const n = Number(raw[k]);
        o[k] = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : DEFAULTS[k];
    }
    for (const [k, allowed] of Object.entries(ENUMS)) {
        const v = String(raw[k] ?? '').trim();
        if (allowed) o[k] = allowed.includes(v) ? v : DEFAULTS[k];
    }
    const modes = Array.isArray(raw.arModes) ? raw.arModes : String(raw.arModes || '').split(/[\s,]+/);
    o.arModes = modes.map((m) => String(m).trim()).filter((m) => AR_MODES.includes(m));
    if (!o.arModes.length) o.arModes = [...DEFAULTS.arModes];
    for (const k of ['src', 'iosSrc', 'poster', 'skyboxImage', 'qrUrl', 'assetsBase', 'apiBase']) o[k] = safeUrl(raw[k]);
    const env = String(raw.environmentImage || '').trim();
    o.environmentImage = env === 'neutral' || env === 'legacy' ? env : safeUrl(env) || DEFAULTS.environmentImage;
    for (const k of ['width', 'height', 'margin', 'padding', 'background', 'cameraOrbit']) o[k] = cssValue(raw[k], DEFAULTS[k]);
    for (const k of ['arButtonBackground', 'arButtonColor']) o[k] = cssValue(raw[k], DEFAULTS[k]);
    o.model = /^mdl_[A-Za-z0-9]{10,40}$/.test(String(raw.model || '').trim()) ? String(raw.model).trim() : '';
    for (const k of ['alt', 'arButtonText', 'qrBrand', 'buttonLabel', 'title']) o[k] = String(raw[k] ?? '').slice(0, 200) || DEFAULTS[k];
    o.css = String(raw.css || '').slice(0, 5000);
    o.viewerId = /^[A-Za-z][\w-]{0,99}$/.test(String(raw.viewerId || '')) ? String(raw.viewerId) : '';
    o.viewerClass = String(raw.viewerClass || '').split(/\s+/).filter((c) => /^[A-Za-z_][\w-]{0,79}$/.test(c)).slice(0, 10).join(' ');
    const frames = Array.isArray(raw.turntable) ? raw.turntable : String(raw.turntable || '').split(/[\s,]+/);
    o.turntable = frames.map(safeUrl).filter(Boolean).slice(0, 120);
    // Premium data: JSON from an attribute, or the value from code; size-capped, never interpreted here.
    o.hotspots = list(raw.hotspots, 100);
    o.items = list(raw.items, 50);
    o.dimensions = object(raw.dimensions);
    o.variants = object(raw.variants);
    o.variant = String(raw.variant || '').slice(0, 100);
    // The plugin stored face-glasses / face-hat in ar_placement; both spellings work.
    const t = String(raw.tryon || '').trim().toLowerCase().replace(/^face-/, '');
    o.tryon = category(t) ? t : ''; // AR-115: a registered category (core: glasses, hat; packs add more)
    const models = object(raw.tryonModels);
    o.tryonModels = models ? { face: safeUrl(models.face), wasmBase: safeUrl(models.wasmBase) } : null;
    if (o.tryonModels && !o.tryonModels.face && !o.tryonModels.wasmBase) o.tryonModels = null;
    const tri = (v) => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : null);
    o.tryonWatermark = tri(raw.tryonWatermark);
    o.tryonHd = tri(raw.tryonHd);
    o.tryonAnatomy = object(raw.tryonAnatomy);
    o.tryonSnapshotName = String(raw.tryonSnapshotName || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);
    o.tryonAccent = cssValue(raw.tryonAccent, '');
    o.tryonLabel = String(raw.tryonLabel ?? '').slice(0, 100) || DEFAULTS.tryonLabel;
    o.tryonConsent = String(raw.tryonConsent ?? '').slice(0, 500);
    o.tryonCalibration = object(raw.tryonCalibration);
    o.premium = raw.premium === true || raw.premium === 'true' ? true : raw.premium === false || raw.premium === 'false' ? false : null;
    o.strings = { ...STRINGS, ...(raw.strings && typeof raw.strings === 'object' ? raw.strings : {}) };
    return o;
}
