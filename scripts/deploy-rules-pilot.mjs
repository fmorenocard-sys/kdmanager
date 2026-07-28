/**
 * deploy-rules-pilot.mjs — déploie firestore.rules sur la base NOMMÉE kdmanagerdb
 * du projet PILOTE kd-41-manager, via l'API Security Rules directement.
 *
 * POURQUOI : `firebase deploy --only firestore:rules --config firebase.pilot.json`
 * renvoie « Deploy complete » mais NE met PAS à jour la base nommée `kdmanagerdb`
 * (bug multi-base du CLI — même raison que scripts/deploy-rules.cjs côté 2997).
 * Symptôme vécu : le champ `accounts` de user_profiles (F-025) restait refusé côté
 * pilote alors que le déploiement disait avoir réussi. Toujours utiliser ce script
 * pour les règles du pilote.
 *
 * Requiert functions/kd-41-manager.json (clé service-account pilote, gitignorée).
 * Usage : node scripts/deploy-rules-pilot.mjs
 */
/* global process */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const ROOT = process.cwd();
const req = createRequire(path.join(ROOT, 'functions', 'package.json'));
const { initializeApp, cert } = req('firebase-admin/app');
const PROJECT = 'kd-41-manager';
const DB = 'kdmanagerdb';

const sa = req(path.join(ROOT, 'functions', 'kd-41-manager.json'));
if (sa.project_id !== PROJECT) throw new Error(`Clé pour ${sa.project_id}, pas ${PROJECT} — abort.`);
const app = initializeApp({ credential: cert(sa), projectId: PROJECT });
const token = (await app.options.credential.getAccessToken()).access_token;
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
if (rules.includes('documents/roles/$(request.auth.uid)')) console.log('✅ firestore.rules OK');
else throw new Error('❌ firestore.rules inattendu (garde-fou path roles).');

console.log('📤 Création du ruleset...');
const crj = await (await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: rules }] } }),
})).json();
if (!crj.name) throw new Error('Création ruleset échouée : ' + JSON.stringify(crj));
console.log('✅ ruleset', crj.name);

const releaseName = `projects/${PROJECT}/releases/cloud.firestore/${DB}`;
const urj = await (await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ release: { name: releaseName, rulesetName: crj.name } }),
})).json();
if (!urj.rulesetName) throw new Error('Update release échoué : ' + JSON.stringify(urj));
console.log(`🎉 Règles déployées sur ${PROJECT}/${DB} -> ${urj.rulesetName}`);
process.exit(0);
