/**
 * AR-109: the <script src=".../atlasar.js"> build (window.AtlasAR). It finds its own folder, so
 * model-viewer and the decoders load from the same place, then defines <atlasar-viewer>.
 */
import AtlasAR, { defineElement } from './index.js';
import { setBase } from './assets.js';

const me = document.currentScript;
setBase(me && me.src ? me.src : '');
if (me && me.dataset.apiBase) AtlasAR.configure({ apiBase: me.dataset.apiBase });

if (!window.AtlasAR) window.AtlasAR = AtlasAR;
if ('customElements' in window) defineElement();
document.dispatchEvent(new CustomEvent('atlasar:sdk-ready', { detail: { version: AtlasAR.VERSION } }));
