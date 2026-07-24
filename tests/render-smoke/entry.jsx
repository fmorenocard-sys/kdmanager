// Entrée du smoke test de rendu (voir run.mjs). Rend le composant King-only avec
// les contextes mockés par le plugin esbuild ; signale toute ReferenceError.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import KvKConfigForm from '../../src/components/war/KvKConfigForm.jsx';

globalThis.window = globalThis;
globalThis.location = { hostname: 'x' };
globalThis.document = { cookie: '' };
globalThis.navigator = { userAgent: 'node' };

(async () => {
  await i18n.init({ lng: 'fr', resources: {}, react: { useSuspense: false } });
  try {
    renderToStaticMarkup(React.createElement(I18nextProvider, { i18n }, React.createElement(KvKConfigForm)));
    console.log('RESULT: RENDER_OK');
  } catch (e) {
    if (e instanceof ReferenceError) { console.log('RESULT: REFERENCE_ERROR:', e.message); process.exit(2); }
    console.log('RESULT: OTHER_ERROR (' + e.constructor.name + '):', String(e.message).slice(0, 60));
  }
})();
