/**
 * AR-109: an AtlasAR Cloud model by its public id (mdl_…). The answer is public (the model files
 * are public anyway) and cacheable; no API key is ever used in the browser.
 *
 *   GET <apiBase>sdk/v1/models/<id>  →  { id, name, height_cm, files: { glb, usdz? }, poster?, viewer? }
 *
 * `viewer` (AR-112: settings saved with the model, in the dashboard or with PUT /v1/models/:id/viewer)
 * becomes options; `premium` says whether the site's plan includes the Premium settings.
 */
import { cloudBase } from './assets.js';

const cache = new Map();

export function fetchModel(id, apiBase) {
    const base = (apiBase || cloudBase()).replace(/\/?$/, '/');
    const url = `${base}sdk/v1/models/${encodeURIComponent(id)}`;
    if (!cache.has(url)) {
        cache.set(url, fetch(url, { credentials: 'omit', mode: 'cors' }).then(async (res) => {
            if (!res.ok) throw new Error(res.status === 404 ? 'model_not_found' : `model_lookup_failed_${res.status}`);
            return res.json();
        }).catch((err) => {
            cache.delete(url); // let a later viewer try again
            throw err;
        }));
    }
    return cache.get(url);
}

/** The model's answer as viewer options (lowest priority: attributes and code win). */
export function modelOptions(m) {
    if (!m || typeof m !== 'object') return {};
    const out = {};
    if (m.files && m.files.glb) out.src = m.files.glb;
    if (m.files && m.files.usdz) out.iosSrc = m.files.usdz;
    if (m.poster) out.poster = m.poster;
    if (m.name) out.alt = m.name;
    if (m.name) out.title = m.name;
    if (Array.isArray(m.turntable)) out.turntable = m.turntable;
    if (m.viewer && typeof m.viewer === 'object') Object.assign(out, m.viewer);
    if (typeof m.premium === 'boolean') out.premium = m.premium; // AR-112: the site's plan
    return out;
}
