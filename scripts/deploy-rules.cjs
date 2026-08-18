/**
 * deploy-rules.cjs
 * Déploie firestore.rules sur les bases Firestore d'un PROJET donné, via l'API REST
 * Rules (ADC locales). Couvre les 2 bases `(default)` et `kdmanagerdb` — chaque
 * release est tentée, un 404 (base inexistante sur ce projet) est ignoré (le pilote
 * n'a que `kdmanagerdb`, 2997 a les deux).
 *
 * ⚠️ Le PROJET est OBLIGATOIRE (pas de défaut) — pour ne jamais déployer par accident
 * sur la prod. Alias acceptés (calqués sur .firebaserc) :
 *   prod | default | 97 | 2997   -> kd-97-manager
 *   pilot | 41 | 3341            -> kd-41-manager
 * Ou un id de projet brut `kd-...`.
 *
 * Usage :
 *   node scripts/deploy-rules.cjs pilot
 *   node scripts/deploy-rules.cjs prod
 *   npm run deploy-rules:pilot   |   npm run deploy-rules:prod
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ALIASES = {
  prod: 'kd-97-manager', default: 'kd-97-manager', '97': 'kd-97-manager', '2997': 'kd-97-manager',
  pilot: 'kd-41-manager', '41': 'kd-41-manager', '3341': 'kd-41-manager',
};

const arg = (process.argv[2] || '').trim();
if (!arg) {
  console.error('❌ Projet requis. Usage : node scripts/deploy-rules.cjs <prod|pilot|kd-xxx>');
  console.error('   Alias : prod|default|97|2997 -> kd-97-manager ; pilot|41|3341 -> kd-41-manager');
  process.exit(1);
}
const PROJECT_ID = ALIASES[arg.toLowerCase()] || (/^kd-[\w-]+$/.test(arg) ? arg : null);
if (!PROJECT_ID) {
  console.error(`❌ Projet inconnu : "${arg}". Attendu un alias (prod/pilot/…) ou un id "kd-...".`);
  process.exit(1);
}

const RULES_FILE = path.join(__dirname, '..', 'firestore.rules');
const credsPath = path.join(process.env.APPDATA, 'firebase', 'f_morenocard_gmail.com_application_default_credentials.json');

async function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Request timed out after 30s')));
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken(creds) {
  const body = new URLSearchParams({
    client_id: creds.client_id, client_secret: creds.client_secret,
    refresh_token: creds.refresh_token, grant_type: 'refresh_token',
  }).toString();
  const result = await httpRequest({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
  }, body);
  if (result.status !== 200) throw new Error(`Token error: ${JSON.stringify(result.body)}`);
  return result.body.access_token;
}

async function createRuleset(token, rulesContent) {
  const payload = JSON.stringify({ source: { files: [{ content: rulesContent, name: 'firestore.rules' }] } });
  const result = await httpRequest({
    hostname: 'firebaserules.googleapis.com', path: `/v1/projects/${PROJECT_ID}/rulesets`, method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  }, payload);
  if (result.status !== 200) throw new Error(`Create ruleset error ${result.status}: ${JSON.stringify(result.body)}`);
  return result.body.name;
}

// Retourne true si la release a été mise à jour, false si elle n'existe pas (404),
// throw pour toute autre erreur.
async function updateRelease(token, releaseName, rulesetName) {
  const payload = JSON.stringify({ release: { name: releaseName, rulesetName } });
  const result = await httpRequest({
    hostname: 'firebaserules.googleapis.com', path: `/v1/${releaseName}`, method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  }, payload);
  if (result.status === 404) return false;
  if (result.status !== 200) throw new Error(`Update release error ${result.status}: ${JSON.stringify(result.body)}`);
  return true;
}

async function main() {
  console.log(`🎯 Cible : ${PROJECT_ID}${PROJECT_ID === 'kd-97-manager' ? '  (⚠️ PROD 2997)' : '  (pilote)'}`);
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  const token = await getAccessToken(creds);

  const rulesContent = fs.readFileSync(RULES_FILE, 'utf-8');
  // Garde-fou de forme : le helper de rôle doit être présent (évite de pousser un
  // fichier vide/corrompu).
  if (!rulesContent.includes('documents/roles/$(request.auth.uid)')) {
    throw new Error('❌ firestore.rules ne contient pas le helper de rôle attendu — abandon.');
  }

  const rulesetName = await createRuleset(token, rulesContent);
  console.log(`✅ ruleset créé : ${rulesetName.split('/').pop()}`);

  const targets = [
    ['(default)', `projects/${PROJECT_ID}/releases/cloud.firestore`],
    ['kdmanagerdb', `projects/${PROJECT_ID}/releases/cloud.firestore/kdmanagerdb`],
  ];
  let updated = 0;
  for (const [label, releaseName] of targets) {
    const ok = await updateRelease(token, releaseName, rulesetName);
    if (ok) { updated++; console.log(`✅ ${label} mis à jour`); }
    else { console.log(`ℹ️ ${label} absent sur ce projet — ignoré`); }
  }
  if (updated === 0) throw new Error('❌ Aucune base mise à jour (aucune release trouvée) — vérifier le projet.');
  console.log(`\n🎉 OK — ${updated} base(s) mise(s) à jour sur ${PROJECT_ID}.`);
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });
