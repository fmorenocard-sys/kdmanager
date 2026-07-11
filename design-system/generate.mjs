/**
 * generate.mjs — builds the self-contained HTML cards synced to the
 * "KD Manager Design System" project on claude.ai/design (DesignSync).
 *
 * Source of truth: src/index.css (@theme), src/components/ui/*.
 * Re-run after changing UI tokens/components, then re-sync the cards:
 *   node design-system/generate.mjs
 *
 * Tokens mirrored from Tailwind v4 defaults + the app theme.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'cards');

// The Claude Design sandbox can't fetch external resources, so the typography
// card embeds the app's self-hosted fonts (public/fonts) as data URIs.
const fontB64 = (file) =>
    fs.readFileSync(path.join(ROOT, '..', 'public', 'fonts', file)).toString('base64');
const FONT_FACES = `
  @font-face { font-family:"Inter"; src:url(data:font/woff2;base64,${fontB64('inter-latin.woff2')}) format("woff2"); font-weight:400 700; font-display:swap; }
  @font-face { font-family:"JetBrains Mono"; src:url(data:font/woff2;base64,${fontB64('jetbrains-mono-latin.woff2')}) format("woff2"); font-weight:400 700; font-display:swap; }
`;

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Inter", system-ui, sans-serif;
    background: #0f172a;
    background-image:
      radial-gradient(circle at 15% 50%, rgba(59,130,246,.08), transparent 25%),
      radial-gradient(circle at 85% 30%, rgba(245,158,11,.05), transparent 25%);
    color: #f8fafc; padding: 24px; -webkit-font-smoothing: antialiased;
  }
  h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin: 22px 0 10px; }
  h2:first-of-type { margin-top: 0; }
  .row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .mono { font-family: "JetBrains Mono", monospace; }
  .note { font-size: 11px; color: #64748b; margin-top: 6px; }
  .glass { background: rgba(15,23,42,.4); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.1); border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,.3); }
`;

const page = (title, body) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>${BASE_CSS}</style></head><body>${body}</body></html>`;

const card = (marker, title, body) => `${marker}\n` + page(title, body);

const swatch = (hex, name, use) => `
  <div style="width:118px">
    <div style="height:52px;border-radius:10px;background:${hex};border:1px solid rgba(255,255,255,.08)"></div>
    <div style="font-size:12px;font-weight:600;margin-top:6px">${name}</div>
    <div class="mono" style="font-size:11px;color:#94a3b8">${hex}</div>
    <div class="note">${use}</div>
  </div>`;

const FILES = {
  // ---------------------------------------------------------- FONDATIONS
  'foundations/colors.html': card(
    '<!-- @dsCard group="Fondations" name="Couleurs" subtitle="Fonds, actions, sémantique, ratings KvK" width="640" -->',
    'Couleurs — KD Manager',
    `
    <h2>Fonds (Slate)</h2>
    <div class="row">
      ${swatch('#0f172a', 'background', 'slate-900 — fond app')}
      ${swatch('#1e293b', 'bg-secondary', 'slate-800 — cartes mobiles')}
      ${swatch('#334155', 'bg-tertiary', 'slate-700 — bordures')}
      ${swatch('#020617', 'slate-950/50', 'fonds d’inputs')}
    </div>
    <h2>Actions</h2>
    <div class="row">
      ${swatch('#f59e0b', 'amber-500', 'bouton primaire')}
      ${swatch('#2563eb', 'blue-600', 'bouton secondaire')}
      ${swatch('#ef4444', 'red-500', 'danger / morts')}
      ${swatch('#94a3b8', 'primary (slate-400)', 'focus rings, texte secondaire')}
    </div>
    <h2>Sémantique</h2>
    <div class="row">
      ${swatch('#10b981', 'success (emerald)', 'KP gagnés, succès')}
      ${swatch('#f97316', 'warning (orange)', 'alertes')}
      ${swatch('#06b6d4', 'info (cyan)', 'informations')}
      ${swatch('#6366f1', 'indigo-500', 'tabs actives, badge En cours')}
    </div>
    <h2>Ratings KvK</h2>
    <div class="row">
      ${swatch('#c084fc', 'Excellent', 'purple-400')}
      ${swatch('#34d399', 'Good', 'emerald-400')}
      ${swatch('#facc15', 'Need Improvement', 'yellow-400')}
      ${swatch('#f87171', 'Dead Weight', 'red-400')}
    </div>`
  ),

  'foundations/typography.html': card(
    '<!-- @dsCard group="Fondations" name="Typographie" subtitle="Inter + JetBrains Mono, gradients de titres" width="560" -->',
    'Typographie — KD Manager',
    `
    <style>${FONT_FACES}</style>
    <h2>Familles</h2>
    <div style="font-size:17px">Inter — interface <span style="color:#94a3b8">(system-ui fallback)</span></div>
    <div class="mono" style="font-size:15px;margin-top:4px;color:#cbd5e1">JetBrains Mono — IDs &amp; valeurs <span class="mono" style="font-variant-numeric:tabular-nums">1 174 227 156</span></div>
    <h2>Titres de pages (gradient)</h2>
    <div style="font-size:28px;font-weight:700;background:linear-gradient(90deg,#ef4444,#ea580c);-webkit-background-clip:text;background-clip:text;color:transparent">Performance KvK</div>
    <div style="font-size:28px;font-weight:700;background:linear-gradient(90deg,#fff,#94a3b8);-webkit-background-clip:text;background-clip:text;color:transparent">heading-xl générique</div>
    <h2>Hiérarchie</h2>
    <div style="font-size:20px;font-weight:700">Titre de carte — 20px bold</div>
    <div style="font-size:14px;color:#f8fafc;margin-top:2px">Corps — 14px, texte primaire #f8fafc</div>
    <div style="font-size:14px;color:#94a3b8">Texte secondaire — #94a3b8</div>
    <div style="font-size:12px;color:#64748b">Légendes / méta — 12px #64748b</div>
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-top:4px">LABELS STATCARD — UPPERCASE TRACKING-WIDER</div>`
  ),

  'foundations/glass.html': card(
    '<!-- @dsCard group="Fondations" name="Glassmorphism" subtitle="Cartes translucides, blur, ombres" width="560" -->',
    'Glassmorphism — KD Manager',
    `
    <h2>Carte standard v2 (.v2-glass — bordure gradient hairline)</h2>
    <style>
      .v2g { position:relative; background:rgba(15,23,42,.45); backdrop-filter:blur(14px); border-radius:14px; box-shadow:0 20px 40px -12px rgba(0,0,0,.4); }
      .v2g::before { content:""; position:absolute; inset:0; border-radius:inherit; padding:1px;
        background:linear-gradient(160deg,rgba(255,255,255,.22),rgba(255,255,255,.04) 40%,rgba(245,158,11,.18));
        -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; }
    </style>
    <div class="v2g" style="padding:24px;max-width:460px">
      <div style="font-size:20px;font-weight:700;margin-bottom:6px">Titre de carte</div>
      <div style="font-size:14px;color:#a8b6ca">surface 45 % · blur 14px · radius 14px · hairline gradient (blanc→ambre)</div>
    </div>
    <h2>Utilitaire .card (hover)</h2>
    <div style="background:rgba(255,255,255,.05);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px;max-width:460px">
      <div style="font-size:14px;color:#cbd5e1">bg-white/5 → hover bg-white/10, border-white/20</div>
    </div>
    <div class="note">Le fond de page porte deux gradients radiaux (bleu 8 %, ambre 5 %) qui donnent la profondeur au verre.</div>`
  ),

  // ---------------------------------------------------------- COMPOSANTS
  'components/buttons.html': card(
    '<!-- @dsCard group="Actions" name="Boutons" subtitle="5 variants × 3 tailles, focus, disabled" width="620" -->',
    'Boutons — KD Manager',
    `
    <style>
      .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; border-radius:8px; font-weight:500; border:none; cursor:pointer; font-family:inherit; transition:background .15s; }
      .md { height:40px; padding:8px 16px; font-size:14px; } .sm { height:32px; padding:0 12px; font-size:12px; } .lg { height:48px; padding:0 32px; font-size:18px; }
      .primary { background:linear-gradient(135deg,#f59e0b,#ea580c); color:#fff; box-shadow:0 4px 16px rgba(234,88,12,.35); } .primary:hover { background:linear-gradient(135deg,#fbbf24,#f97316); }
      .secondary { background:linear-gradient(135deg,#6366f1,#a855f7); color:#fff; box-shadow:0 4px 16px rgba(139,92,246,.35); } .secondary:hover { filter:brightness(1.1); }
      .outline { background:transparent; border:1px solid rgba(255,255,255,.2); color:#f1f5f9; } .outline:hover { background:rgba(255,255,255,.05); }
      .ghost { background:transparent; color:#cbd5e1; } .ghost:hover { background:rgba(255,255,255,.1); color:#fff; }
      .danger { background:#ef4444; color:#fff; } .danger:hover { background:#dc2626; }
      .focus { outline:none; box-shadow:0 0 0 2px #0f172a, 0 0 0 4px #94a3b8; }
    </style>
    <h2>Variants (md) — v2 : gradients + glow</h2>
    <div class="row">
      <button class="btn md primary">Primary</button>
      <button class="btn md secondary">Secondary</button>
      <button class="btn md outline">Outline</button>
      <button class="btn md ghost">Ghost</button>
      <button class="btn md danger">Danger</button>
    </div>
    <h2>Tailles</h2>
    <div class="row">
      <button class="btn sm primary">Small</button>
      <button class="btn md primary">Medium</button>
      <button class="btn lg primary">Large</button>
    </div>
    <h2>États</h2>
    <div class="row">
      <button class="btn md primary focus">Focus ring</button>
      <button class="btn md primary" style="opacity:.5;pointer-events:none">Disabled</button>
    </div>
    <div class="note">Focus ring global : ring-2 primary + ring-offset slate-900 (règle a11y du projet).</div>`
  ),

  'components/inputs.html': card(
    '<!-- @dsCard group="Formulaires" name="Inputs & Select" subtitle="Label, icône, date, sélecteur de campagne" width="560" -->',
    'Inputs — KD Manager',
    `
    <style>
      label { display:block; font-size:14px; font-weight:500; color:#94a3b8; margin:0 0 4px; }
      .inp { width:100%; max-width:380px; background:rgba(2,6,23,.5); border:1px solid #1e293b; border-radius:8px; padding:8px 16px; font-size:14px; color:#e2e8f0; font-family:inherit; }
      .inp::placeholder { color:#64748b; }
      .inp:focus { outline:none; box-shadow:0 0 0 2px rgba(148,163,184,.5); }
      .wrap { position:relative; max-width:380px; }
      .wrap .inp { padding-left:40px; }
      .ico { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#64748b; }
      .sel { background:rgba(15,23,42,.8); border:1px solid #334155; border-radius:8px; padding:10px 12px; font-size:14px; color:#e2e8f0; font-family:inherit; min-height:44px; }
      .fld { margin-bottom:16px; }
    </style>
    <div class="fld"><label>Avec label</label><input class="inp" value="SoC 4: King of All Britain (2026)"></div>
    <div class="fld"><label>Recherche (leftIcon)</label>
      <div class="wrap"><span class="ico">🔍</span><input class="inp" placeholder="Rechercher un joueur..."></div>
    </div>
    <div class="fld"><label>Date</label><input type="date" class="inp" value="2026-06-11" style="max-width:200px"></div>
    <div class="fld"><label>Sélecteur de campagne</label>
      <select class="sel"><option>SoC 4: King of All Britain (2026) — En cours</option><option>SoC 3: Heroic Anthem (2026)</option></select>
    </div>
    <div class="note">Cibles tactiles ≥ 44px (règle responsiveness du projet).</div>`
  ),

  'components/stat-cards.html': card(
    '<!-- @dsCard group="Data" name="StatCards" subtitle="Bordure gauche colorée + bulle d’icône" width="720" -->',
    'StatCards — KD Manager',
    `
    <style>
      .stat { display:flex; justify-content:space-between; align-items:center; gap:16px; background:rgba(15,23,42,.5); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,.1); border-left-width:4px; border-radius:12px; padding:20px; width:220px; }
      .t { font-size:12px; font-weight:500; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; }
      .v { font-size:22px; font-weight:700; margin-top:2px; }
      .b { padding:12px; border-radius:12px; font-size:20px; }
    </style>
    <div class="row">
      <div class="stat" style="border-left-color:#ef4444"><div><div class="t">Morts totaux</div><div class="v">46 698 975</div></div><div class="b" style="background:rgba(239,68,68,.2)">💀</div></div>
      <div class="stat" style="border-left-color:#f59e0b"><div><div class="t">Diff puissance</div><div class="v" style="color:#f87171">-45 832 920</div></div><div class="b" style="background:rgba(245,158,11,.2)">📉</div></div>
      <div class="stat" style="border-left-color:#10b981"><div><div class="t">KP gagnés</div><div class="v" style="color:#34d399">11.9B</div></div><div class="b" style="background:rgba(16,185,129,.2)">⚡</div></div>
    </div>
    <div class="note">9 couleurs disponibles : blue, red, amber, emerald, yellow, purple, orange, stone, slate.</div>`
  ),

  'components/badges.html': card(
    '<!-- @dsCard group="Data" name="Badges & Progress" subtitle="Ratings KvK, statuts de campagne, % objectif" width="640" -->',
    'Badges — KD Manager',
    `
    <style>
      .bdg { display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:999px; font-size:11px; font-weight:700; border:1px solid; }
      .pill { display:inline-block; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:700; }
      .bar { width:140px; height:8px; background:#0f172a; border-radius:999px; overflow:hidden; display:inline-block; vertical-align:middle; }
    </style>
    <h2>Ratings KvK</h2>
    <div class="row">
      <span class="bdg" style="color:#c084fc;background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.2)">Excellent</span>
      <span class="bdg" style="color:#34d399;background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.2)">Good</span>
      <span class="bdg" style="color:#facc15;background:rgba(234,179,8,.1);border-color:rgba(234,179,8,.2)">Need Improvement</span>
      <span class="bdg" style="color:#f87171;background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.2)">Dead Weight</span>
    </div>
    <h2>Statuts de campagne (F-015)</h2>
    <div class="row">
      <span class="bdg" style="color:#fbbf24;background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.2)">🗃 Archivée</span>
      <span class="bdg" style="color:#818cf8;background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.2)">En cours</span>
      <span class="bdg" style="color:#38bdf8;background:rgba(14,165,233,.1);border-color:rgba(14,165,233,.2)">Comptes secondaires</span>
    </div>
    <h2>% Objectif</h2>
    <div class="row">
      <span class="pill" style="color:#4ade80;background:rgba(74,222,128,.1)">136.5%</span>
      <span class="pill" style="color:#facc15;background:rgba(250,204,21,.1)">69.0%</span>
      <span class="pill" style="color:#f87171;background:rgba(248,113,113,.1)">7.8%</span>
      <span class="bar"><span style="display:block;height:100%;width:87%;background:#eab308;border-radius:999px"></span></span>
      <span class="mono" style="font-size:12px;color:#cbd5e1">87.3%</span>
    </div>
    <div class="note">Seuils : ≥100 % vert · ≥50 % jaune · &lt;50 % rouge (identiques table, cartes mobiles et vue progression).</div>`
  ),

  'components/table.html': card(
    '<!-- @dsCard group="Data" name="Table & carte mobile" subtitle="Rangées desktop + variante mobile card" width="760" -->',
    'Table — KD Manager',
    `
    <style>
      table { border-collapse:collapse; width:100%; font-size:12px; }
      th { text-align:left; padding:8px; color:#94a3b8; font-weight:600; background:rgba(15,23,42,.8); white-space:nowrap; }
      td { padding:6px 8px; border-bottom:1px solid rgba(255,255,255,.05); font-variant-numeric:tabular-nums; }
      tr:hover td { background:rgba(255,255,255,.05); }
      .id { font-family:"JetBrains Mono",monospace; color:#64748b; font-size:11px; }
      .av { width:20px; height:20px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#a855f7); display:inline-block; vertical-align:middle; margin-right:6px; border:1px solid #334155; }
      .bdg { padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; border:1px solid; }
      .mob { background:rgba(30,41,59,.8); border:1px solid #334155; border-radius:12px; padding:12px; max-width:340px; margin-top:8px; }
      .kv { display:flex; justify-content:space-between; background:rgba(15,23,42,.5); padding:6px; border-radius:6px; font-size:11px; }
    </style>
    <h2>Desktop (dans une Card glass, en-tête sticky)</h2>
    <div class="glass" style="padding:0;overflow:hidden">
    <table>
      <tr><th>#</th><th>ID</th><th>Nom</th><th>Puis. finale</th><th>KP gagnés</th><th>% Goal</th><th>Note</th></tr>
      <tr><td>1</td><td class="id">75481347</td><td><span class="av"></span>Lord Guineapig</td><td>123 003 111</td><td style="color:#34d399;font-weight:700">+1 174 227 156</td><td><span style="color:#4ade80;background:rgba(74,222,128,.1);padding:2px 6px;border-radius:6px;font-weight:700;font-size:10px">136.5%</span></td><td><span class="bdg" style="color:#c084fc;background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.2)">Excellent</span></td></tr>
      <tr><td>2</td><td class="id">79650085</td><td><span class="av" style="background:linear-gradient(135deg,#f59e0b,#ef4444)"></span>Keshiba ツ</td><td>84 681 280</td><td style="color:#34d399;font-weight:700">+35 853 547</td><td><span style="color:#f87171;background:rgba(248,113,113,.1);padding:2px 6px;border-radius:6px;font-weight:700;font-size:10px">7.8%</span></td><td><span class="bdg" style="color:#f87171;background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.2)">Dead Weight</span></td></tr>
    </table>
    </div>
    <h2>Mobile (&lt; 768px — jamais de scroll horizontal)</h2>
    <div class="mob">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(51,65,85,.5);padding-bottom:8px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px"><span style="background:#0f172a;color:#94a3b8;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px">#1</span><span class="av" style="width:28px;height:28px"></span><div><div style="font-size:13px;font-weight:700">Lord Guineapig</div><div class="id">75481347</div></div></div>
        <span class="bdg" style="color:#c084fc;background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.2)">Excellent</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div class="kv"><span style="color:#64748b">Puis. finale</span><span class="mono">123 003 111</span></div>
        <div class="kv"><span style="color:#64748b">KP gagnés</span><span class="mono" style="color:#34d399">+1.17B</span></div>
      </div>
    </div>`
  ),

  'components/avatar.html': card(
    '<!-- @dsCard group="Data" name="Avatars" subtitle="7 tailles, ring, cascade de sources (F-016)" width="560" -->',
    'Avatars — KD Manager',
    `
    <style>
      .a { border-radius:50%; background:linear-gradient(135deg,#6366f1,#a855f7); display:inline-flex; align-items:center; justify-content:center; font-weight:700; color:#fff; }
      .ring { border:2px solid #334155; }
      .fb { background:#1e293b; color:#64748b; }
    </style>
    <h2>Tailles</h2>
    <div class="row" style="align-items:flex-end">
      <span class="a" style="width:24px;height:24px;font-size:10px">xs</span>
      <span class="a" style="width:32px;height:32px;font-size:11px">sm</span>
      <span class="a" style="width:40px;height:40px;font-size:12px">md</span>
      <span class="a" style="width:48px;height:48px;font-size:13px">lg</span>
      <span class="a" style="width:64px;height:64px;font-size:14px">xl</span>
      <span class="a" style="width:96px;height:96px;font-size:18px">2xl</span>
    </div>
    <h2>Ring & fallback logo</h2>
    <div class="row">
      <span class="a ring" style="width:48px;height:48px;font-size:12px">ring</span>
      <span class="a fb ring" style="width:48px;height:48px;font-size:20px">👑</span>
    </div>
    <h2>Cascade de sources (F-016)</h2>
    <div class="note" style="font-size:12px;line-height:1.7">
      1. prop <span class="mono">src</span> explicite → 2. URL fraîche <span class="mono">static_data/avatars</span> (CDN Lilith, puis avatar Discord) → 3. JPG local historique → 4. logo.<br>
      Une image cassée bascule automatiquement au niveau suivant (onError).
    </div>`
  ),

  'components/navigation.html': card(
    '<!-- @dsCard group="Navigation" name="Tabs, sidebar & bottom nav" subtitle="Pills d’onglets, item sidebar, nav mobile" width="620" -->',
    'Navigation — KD Manager',
    `
    <style>
      .tab { display:inline-flex; align-items:center; gap:8px; padding:8px 16px; border-radius:999px; font-size:13px; font-weight:700; border:1px solid; cursor:pointer; background:transparent; font-family:inherit; }
      .on { color:#818cf8; background:rgba(99,102,241,.1); border-color:rgba(99,102,241,.2); box-shadow:0 10px 15px -3px rgba(99,102,241,.1); }
      .off { color:#94a3b8; background:rgba(30,41,59,.5); border-color:#334155; }
      .side { width:220px; background:rgba(15,23,42,.95); border:1px solid rgba(255,255,255,.1); border-radius:12px; padding:8px; }
      .it { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px; font-size:14px; color:#94a3b8; }
      .it.act { background:rgba(99,102,241,.15); color:#e0e7ff; font-weight:600; }
      .bot { display:flex; justify-content:space-around; background:rgba(15,23,42,.95); border:1px solid rgba(255,255,255,.1); border-radius:14px; padding:8px; width:340px; }
      .bi { display:flex; flex-direction:column; align-items:center; gap:2px; font-size:10px; color:#64748b; min-width:44px; padding:4px; }
      .bi.act { color:#818cf8; }
    </style>
    <h2>Onglets (pills)</h2>
    <div class="row">
      <button class="tab on">👥 Comptes Principaux</button>
      <button class="tab off">👥 Comptes Secondaires</button>
      <button class="tab off">🕘 Progression</button>
    </div>
    <h2>Sidebar (desktop, logique start/end pour le RTL)</h2>
    <div class="side">
      <div class="it act">⚔️ <span>Performance</span></div>
      <div class="it">🏰 <span>Tableau de Bord</span></div>
      <div class="it">🛡️ <span>Suivi de Guerre</span></div>
    </div>
    <h2>Bottom nav (mobile)</h2>
    <div class="bot">
      <div class="bi act">🏰<span>Accueil</span></div>
      <div class="bi">⚔️<span>KvK</span></div>
      <div class="bi">🛡️<span>Guerre</span></div>
      <div class="bi">🏦<span>Banque</span></div>
      <div class="bi">👤<span>Profil</span></div>
    </div>`
  ),
};

fs.rmSync(OUT, { recursive: true, force: true });
for (const [rel, html] of Object.entries(FILES)) {
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, html);
    console.log('wrote', rel, `(${(html.length / 1024).toFixed(1)} KB)`);
}
console.log('Done —', Object.keys(FILES).length, 'cards in', OUT);
