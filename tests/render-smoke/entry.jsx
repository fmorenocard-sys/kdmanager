// Entrée du smoke test de rendu (voir run.mjs). Rend le composant King-only avec
// les contextes mockés par le plugin esbuild ; signale toute ReferenceError.
/* global process */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import KvKConfigForm from '../../src/components/war/KvKConfigForm.jsx';
import GoalFormulaDetails from '../../src/components/kvk/GoalFormulaDetails.jsx';
import MyGoalCard from '../../src/components/me/MyGoalCard.jsx';
import fr from '../../src/locales/fr/translation.json' with { type: 'json' };

globalThis.window = globalThis;
globalThis.location = { hostname: 'x' };
globalThis.document = { cookie: '' };
globalThis.navigator = { userAgent: 'node' };

(async () => {
  // Traductions réelles : un rendu avec `resources: {}` ne prouve pas que les
  // clés existent (i18next affiche la clé brute au lieu d'échouer).
  await i18n.init({ lng: 'fr', resources: { fr: { translation: fr } }, react: { useSuspense: false } });
  const wrap = (el) => React.createElement(I18nextProvider, { i18n }, el);
  // Ligne d'objectif factice (F-038 Lot A) — MyGoalCard est derrière l'auth.
  const row = {
    governorId: '123', name: 'Test', type: 'war', published: true,
    pct: 0.42, powerM: 74.3, goalKp: 329.3, kpGained: 138e6, minDeadTroops: 559500, rate: 'Good'
  };
  try {
    renderToStaticMarkup(wrap(React.createElement(KvKConfigForm)));
    const formula = renderToStaticMarkup(wrap(React.createElement(GoalFormulaDetails, { powerM: 74.3 })));
    renderToStaticMarkup(wrap(React.createElement(MyGoalCard, { rows: [row], primaryId: '123', revealed: true })));
    // Dump lisible : sert à vérifier de visu les formules et les chiffres affichés.
    const text = formula.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log('FORMULA_TEXT:', text);
    if (/goals\.[a-z_]+/.test(text)) { console.log('RESULT: MISSING_I18N_KEY'); process.exit(3); }
    console.log('RESULT: RENDER_OK');
  } catch (e) {
    if (e instanceof ReferenceError) { console.log('RESULT: REFERENCE_ERROR:', e.message); process.exit(2); }
    console.log('RESULT: OTHER_ERROR (' + e.constructor.name + '):', String(e.message).slice(0, 60));
  }
})();
