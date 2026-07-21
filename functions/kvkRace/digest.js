/**
 * digest.js — Pipeline cloud KvK Race (E-005 / F-018, jalon 2).
 *
 * Flux :
 *   Officier → getRaceScanUploadUrl (callable, rôle vérifié dans Firestore, BR-014)
 *            → PUT du .xlsx sur l'URL signée → gs://kd-97-manager-kvk-race/
 *              kvk_race/{campaignId}/scans/{fichier}
 *   digestRaceScan (trigger onFinalized) :
 *     1. parse le scan (moteur jalon 1), extrait les valeurs légères par gouverneur
 *     2. écrit derived/gov_values_{seq}.json (re-digestion et audit possibles)
 *     3. recompute complet de la campagne depuis TOUS les derived (léger, exact,
 *        prend en compte la config du moment : poids DKP, exclusions, duel)
 *     4. écrit les documents pré-agrégés dans Firestore kvk_race/{campaignId}
 *        (1–2 reads par vue côté app, lecture King/Officer — décision §9.4)
 *
 * Le bucket est privé (IAM, public access prevention) : aucun accès client direct.
 */

import {onObjectFinalized} from "firebase-functions/v2/storage";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getStorage} from "firebase-admin/storage";
import {getFirestore} from "firebase-admin/firestore";

import {parseScanFilename, readScanWorkbook} from "./parse.js";
import {buildAll} from "./engine.js";
import {resolveDkpWeights, DIFF_METRIC_COLS} from "./metrics.js";

export const RACE_BUCKET = "kd-97-manager-kvk-race";
const DB_NAME = "kdmanagerdb";
const TOP_N = 200;

const db = () => getFirestore(DB_NAME);

// kvk_race/{campaignId}/scans/{fichier}.xlsx — les écritures derived/ ne matchent pas.
const SCAN_PATH_RE = /^kvk_race\/([a-z0-9_-]+)\/scans\/([^/]+\.xlsx)$/i;
const seqKey = (seq) => String(seq).padStart(3, "0");

/** Colonnes conservées dans les fichiers dérivés par gouverneur.
 * scan_seq/scan_ts sont indispensables : le moteur filtre et groupe dessus. */
const LIGHT_COLS = [
    "scan_seq", "scan_ts", "governor_id", "name", "kingdom", "campid", "camp",
    "latest_power", ...DIFF_METRIC_COLS,
];

/**
 * Recompute complet d'une campagne depuis les fichiers dérivés + config Firestore.
 * @param {string} campaignId
 * @param {object} bucket
 */
export async function recomputeRace(campaignId, bucket) {
    const [files] = await bucket.getFiles({prefix: `kvk_race/${campaignId}/derived/`});
    const metas = [];
    const players = [];
    for (const f of files) {
        if (!f.name.endsWith(".json")) continue;
        const [buf] = await f.download();
        const payload = JSON.parse(buf.toString("utf8"));
        metas.push(payload.meta);
        players.push(...payload.rows);
    }
    if (!metas.length) {
        logger.warn(`recomputeRace(${campaignId}) : aucun scan dérivé`);
        return;
    }
    metas.sort((a, b) => (a.scanSeq - b.scanSeq));

    const cfgSnap = await db().doc(`kvk_race/${campaignId}`).get();
    const cfg = cfgSnap.exists ? cfgSnap.data() : {};
    const data = buildAll(players, metas, {
        baseSeq: cfg["base_scan_override"] ?? null,
        exclusions: cfg["exclusions"] || [],
        dkpWeights: resolveDkpWeights(cfg["dkp"]),
        heroDuel: (cfg["hero_duel"] || [2, 3]).map(Number),
        info: (msg) => logger.info(`[${campaignId}] ${msg}`),
    });

    const batch = db().batch();
    const root = db().doc(`kvk_race/${campaignId}`);
    const seqs = [...new Set(data.camps.map((r) => r["scan_seq"]))].sort((a, b) => a - b);

    for (const seq of seqs) {
        const meta = metas.find((m) => m.scanSeq === seq) || null;
        batch.set(root.collection("scans").doc(seqKey(seq)), {
            "seq": seq,
            "meta": meta,
            "camps": data.camps.filter((r) => r["scan_seq"] === seq),
            "duel": data.duel.find((r) => r["scan_seq"] === seq) || null,
            "updatedAt": new Date().toISOString(),
        });
        batch.set(root.collection("kingdoms").doc(seqKey(seq)), {
            "seq": seq,
            "list": data.kingdoms.filter((r) => r["scan_seq"] === seq),
            "updatedAt": new Date().toISOString(),
        });
        const top = data.players
            .filter((r) => r["scan_seq"] === seq)
            .sort((x, y) => (y["dkp_net"] ?? -1) - (x["dkp_net"] ?? -1))
            .slice(0, TOP_N)
            .map((r) => Object.fromEntries(
                ["governor_id", "name", "kingdom", "camp", "dkp_net", "net_kills_iv_diff",
                    "net_kills_v_diff", "net_dead_diff", "net_kill_points_diff", "latest_power"]
                    .map((c) => [c, r[c] ?? null]),
            ));
        batch.set(root.collection("players_top").doc(seqKey(seq)), {
            "seq": seq,
            "list": top,
            "updatedAt": new Date().toISOString(),
        });
    }

    batch.set(root, {
        "baseSeq": data.baseSeq,
        "scanCount": seqs.length,
        "latestSeq": seqs.length ? seqs[seqs.length - 1] : null,
        "latestDuel": data.duel.length ? data.duel[data.duel.length - 1] : null,
        "exclusionsApplied": data.exclusionsApplied,
        "lastDigestAt": new Date().toISOString(),
    }, {merge: true});

    await batch.commit();
    logger.info(`recomputeRace(${campaignId}) : ${seqs.length} scans agrégés, ` +
        `base=${data.baseSeq}, latest=${seqs[seqs.length - 1]}`);
}

/**
 * Trigger : un scan .xlsx déposé dans le bucket → dérivé + recompute campagne.
 */
export const digestRaceScan = onObjectFinalized(
    {bucket: RACE_BUCKET, region: "us-central1", memory: "1GiB", timeoutSeconds: 300},
    async (event) => {
        const objectName = event.data.name || "";
        const m = SCAN_PATH_RE.exec(objectName);
        if (!m) return; // derived/, dossiers, autres fichiers : ignorés
        const [, campaignId, filename] = m;

        const meta = parseScanFilename(filename);
        if (!meta) {
            logger.warn(`Scan ignoré (nom non reconnu) : ${objectName}`);
            return;
        }

        logger.info(`Digestion ${campaignId} seq ${meta.scanSeq} (${filename})`);
        const bucket = getStorage().bucket(event.data.bucket);
        const [buf] = await bucket.file(objectName).download();
        const {full} = readScanWorkbook(buf, meta, (msg) => logger.warn(msg));
        if (!full.length) {
            logger.error(`Feuille Full Data vide/absente : ${objectName} — digestion abandonnée`);
            return;
        }

        const light = full.map((r) => Object.fromEntries(
            LIGHT_COLS.filter((c) => c in r).map((c) => [c, r[c]]),
        ));
        await bucket.file(`kvk_race/${campaignId}/derived/gov_values_${seqKey(meta.scanSeq)}.json`)
            .save(JSON.stringify({meta, "rows": light}), {contentType: "application/json"});
        logger.info(`Dérivé écrit : seq ${meta.scanSeq}, ${light.length} gouverneurs`);

        await recomputeRace(campaignId, bucket);
    },
);

/** Vérifie que l'appelant est King/Officer (roles/{uid}). Renvoie le rôle. */
async function requireLeadership(request) {
    const uid = request.auth && request.auth.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Login required.");
    const roleSnap = await db().doc(`roles/${uid}`).get();
    const role = roleSnap.exists ? roleSnap.data().role : null;
    if (role !== "King" && role !== "Officer") {
        throw new HttpsError("permission-denied", "Leadership role required (BR-014).");
    }
    return {uid, role};
}

/**
 * Callable : recalcul immédiat d'une campagne (US-016) — après un changement de
 * config (poids DKP, exclusions, duel), sans attendre le prochain scan.
 */
export const recomputeRaceCampaign = onCall(
    {region: "us-central1", memory: "1GiB", timeoutSeconds: 300},
    async (request) => {
        const {uid, role} = await requireLeadership(request);
        const campaignId = String((request.data || {}).campaignId || "");
        if (!/^[a-z0-9_-]+$/i.test(campaignId)) {
            throw new HttpsError("invalid-argument", "Invalid campaignId.");
        }
        logger.info(`Recompute demandé pour ${campaignId} (par ${uid}, rôle ${role})`);
        await recomputeRace(campaignId, getStorage().bucket(RACE_BUCKET));
        const snap = await db().doc(`kvk_race/${campaignId}`).get();
        const d = snap.exists ? snap.data() : {};
        return {"ok": true, "scanCount": d.scanCount ?? 0, "latestSeq": d.latestSeq ?? null};
    },
);

/**
 * Callable : URL d'upload signée pour un scan (BR-014 — leadership uniquement).
 * Le rôle est vérifié dans Firestore roles/{uid} (King ou Officer).
 */
export const getRaceScanUploadUrl = onCall(
    {region: "us-central1"},
    async (request) => {
        const {uid, role} = await requireLeadership(request);
        const campaignId = String((request.data || {}).campaignId || "");
        const filename = String((request.data || {}).filename || "");
        if (!/^[a-z0-9_-]+$/i.test(campaignId)) {
            throw new HttpsError("invalid-argument", "Invalid campaignId.");
        }
        if (!filename.toLowerCase().endsWith(".xlsx") || !parseScanFilename(filename)) {
            throw new HttpsError("invalid-argument",
                "Filename must match the scan convention (e.g. 002_1249539_06_16_2026,_11_07_14_AM.xlsx).");
        }

        const path = `kvk_race/${campaignId}/scans/${filename}`;
        const [url] = await getStorage().bucket(RACE_BUCKET).file(path).getSignedUrl({
            version: "v4",
            action: "write",
            expires: Date.now() + 15 * 60 * 1000,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        logger.info(`Upload URL émise pour ${path} (par ${uid}, rôle ${role})`);
        return {url, path, "expiresInMinutes": 15};
    },
);
