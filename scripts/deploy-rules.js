/**
 * deploy-rules.js
 * Deploys firestore.rules directly to both (default) and kdmanagerdb
 * using the Firebase Rules REST API with Application Default Credentials.
 * 
 * Usage: node scripts/deploy-rules.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ID = 'kd-97-manager';
const RULES_FILE = path.join(__dirname, '..', 'firestore.rules');

// Load credentials
const credsPath = path.join(
  process.env.APPDATA,
  'firebase',
  'f_morenocard_gmail.com_application_default_credentials.json'
);

async function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timed out after 30s'));
    });
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken(creds) {
  const body = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: creds.refresh_token,
    grant_type: 'refresh_token',
  }).toString();

  const result = await httpRequest({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  if (result.status !== 200) throw new Error(`Token error: ${JSON.stringify(result.body)}`);
  return result.body.access_token;
}

async function createRuleset(token, rulesContent) {
  const payload = JSON.stringify({
    source: {
      files: [{ content: rulesContent, name: 'firestore.rules' }],
    },
  });

  const result = await httpRequest({
    hostname: 'firebaserules.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/rulesets`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, payload);

  if (result.status !== 200) throw new Error(`Create ruleset error ${result.status}: ${JSON.stringify(result.body)}`);
  return result.body.name;
}

async function updateRelease(token, releaseName, rulesetName) {
  const payload = JSON.stringify({
    release: { name: releaseName, rulesetName },
  });

  const encodedReleaseName = releaseName.replace(/\//g, '%2F').replace(/(projects%2F[^%]+%2Freleases)%2F/, '$1/');
  const pathUrl = `/v1/${releaseName}`;

  const result = await httpRequest({
    hostname: 'firebaserules.googleapis.com',
    path: pathUrl,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  }, payload);

  if (result.status !== 200) throw new Error(`Update release error ${result.status}: ${JSON.stringify(result.body)}`);
  return result.body;
}

async function main() {
  console.log('📋 Loading credentials...');
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

  console.log('🔑 Getting access token...');
  const token = await getAccessToken(creds);
  console.log('✅ Token obtained');

  console.log('📄 Reading firestore.rules...');
  const rulesContent = fs.readFileSync(RULES_FILE, 'utf-8');
  
  // Verify the fix is in the file
  if (rulesContent.includes('documents/roles/$(request.auth.uid)')) {
    console.log('✅ Rules contain correct "roles/" path');
  } else {
    throw new Error('❌ Rules file does NOT contain the fix! Check firestore.rules');
  }

  console.log('📤 Creating new ruleset...');
  const rulesetName = await createRuleset(token, rulesContent);
  console.log(`✅ New ruleset created: ${rulesetName}`);

  // Update (default) database release
  console.log('🔄 Updating (default) database release...');
  const defaultReleaseName = `projects/${PROJECT_ID}/releases/cloud.firestore`;
  await updateRelease(token, defaultReleaseName, rulesetName);
  console.log('✅ (default) database updated');

  // Update kdmanagerdb release
  console.log('🔄 Updating kdmanagerdb release...');
  const kvkReleaseName = `projects/${PROJECT_ID}/releases/cloud.firestore/kdmanagerdb`;
  await updateRelease(token, kvkReleaseName, rulesetName);
  console.log('✅ kdmanagerdb updated');

  console.log('');
  console.log('🎉 DONE! Both databases now have the correct rules.');
  console.log('   getUserRole() now reads from: roles/{uid}');
  console.log('   The KvK Config save should work immediately.');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
