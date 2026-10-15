/**
 * AR-109: the ES module build (npm, or <script type="module">). Its files load from next to the
 * module; when you bundle it into your own app, call AtlasAR.configure({ assetsBase }) with the
 * folder that holds vendor/ (or keep the default: AtlasAR Cloud's /sdk/v1/).
 */
import AtlasAR, { defineElement } from './index.js';
import { setBase } from './assets.js';

setBase(import.meta.url);
if (typeof window !== 'undefined' && 'customElements' in window) defineElement();

export * from './index.js';
export default AtlasAR;
