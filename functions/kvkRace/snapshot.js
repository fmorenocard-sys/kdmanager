/**
 * snapshot.js — Publication Discord du duel de course (E-005 Phase 2 / US-021).
 *
 * Remplace les copies d'écran manuelles du Roi : après chaque ingestion de scan,
 * le duel du scan le plus récent est posté dans un salon Discord.
 *
 * Choix de conception :
 *  - **déclenché par l'ingestion seule** (digestRaceScan), jamais par
 *    recomputeRaceCampaign : un ajustement de config du Roi ne doit pas
 *    republier un snapshot identique dans le salon ;
 *  - **idempotent** : `lastSnapshotSeq` sur le document de campagne empêche de
 *    republier le même scan (re-digestion, rejeu, retry de la Function) ;
 *  - **jamais bloquant** : toute erreur d'envoi est journalisée puis avalée —
 *    une panne Discord ne doit pas faire échouer une digestion réussie ;
 *  - **silencieux par défaut** : sans salon configuré, la fonction ne fait rien.
 *
 * Le salon se configure par campagne (`discord_channel_id`, éditable par le Roi
 * dans RaceConfigForm) et non par variable d'environnement : changer de salon
 * entre deux saisons ne doit pas demander un redéploiement.
 */

import * as logger from "firebase-functions/logger";

const DISCORD_API = "https://discord.com/api/v10";

// Couleurs des embeds — reprises de la charte v2 (ambre CTA, vert/rouge sémantiques).
const COLOR_AHEAD = 0x059669;
const COLOR_BEHIND = 0xdc2626;
const COLOR_NEUTRAL = 0xd97706;

/** Formate un entier long en notation compacte (1 075 586 926 506 → 1.1T).
 * Écrit à la main plutôt qu'avec Intl : côté Function la locale par défaut
 * n'est pas garantie, et le rendu doit être identique d'un scan à l'autre. */
function fmtCompact(num) {
    if (num == null) return "—";
    const sign = num < 0 ? "-" : "";
    const abs = Math.abs(num);
    const units = [
        [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"],
    ];
    for (const [scale, suffix] of units) {
        if (abs >= scale) {
            const v = abs / scale;
            // Une décimale sous 100, aucune au-delà — même règle que le front.
            return sign + (v < 100 ? v.toFixed(1) : Math.round(v)) + suffix;
        }
    }
    return sign + String(Math.round(abs));
}

/** Ajoute un signe explicite : un écart de course se lit toujours signé. */
function fmtSigned(num) {
    if (num == null) return "—";
    return (num >= 0 ? "+" : "") + fmtCompact(num);
}

/**
 * Construit l'embed du duel.
 * @param {object} p paramètres
 * @param {string} p.campaignId identifiant de campagne
 * @param {object} p.cfg configuration de campagne (labels, hero_duel, our_camp)
 * @param {object} p.duel ligne de duel du scan courant
 * @param {object} p.previousDuel ligne de duel du scan précédent (variation)
 * @param {object} p.meta méta du scan (horodatage)
 * @return {object} embed Discord
 */
export function buildDuelEmbed({campaignId, cfg, duel, previousDuel, meta}) {
    const labels = cfg["labels"] || {};
    const [campA, campB] = (cfg["hero_duel"] || [2, 3]).map(Number);
    const nameA = labels[campA] || `Camp ${campA}`;
    const nameB = labels[campB] || `Camp ${campB}`;

    const ecart = duel["ecart"] ?? null;
    // La variation d'écart est ce qui intéresse vraiment : elle dit si la course
    // se resserre ou se creuse depuis le scan précédent.
    const variation = (ecart != null && previousDuel && previousDuel["ecart"] != null)
        ? ecart - previousDuel["ecart"]
        : null;

    // « Notre camp » n'est pas forcément le camp A du duel : la couleur suit
    // notre position réelle, pas l'ordre d'affichage.
    const ourCamp = cfg["our_camp"] != null ? Number(cfg["our_camp"]) : null;
    let color = COLOR_NEUTRAL;
    if (ecart != null && ourCamp != null) {
        if (ourCamp === campA) color = ecart >= 0 ? COLOR_AHEAD : COLOR_BEHIND;
        else if (ourCamp === campB) color = ecart <= 0 ? COLOR_AHEAD : COLOR_BEHIND;
    }

    const leader = ecart == null ? null : (ecart >= 0 ? nameA : nameB);

    const fields = [
        {name: nameA, value: `**${fmtCompact(duel["camp_a"])}**`, inline: true},
        {name: nameB, value: `**${fmtCompact(duel["camp_b"])}**`, inline: true},
        {
            name: "Écart",
            value: leader
                ? `**${fmtSigned(ecart)}**\n${leader} en tête`
                : "—",
            inline: true,
        },
    ];

    if (variation != null) {
        fields.push({
            name: "Variation depuis le scan précédent",
            value: `${fmtSigned(variation)} ${variation === 0 ? "" : (variation > 0 ? "(en faveur de " + nameA + ")" : "(en faveur de " + nameB + ")")}`.trim(),
            inline: false,
        });
    }

    return {
        title: `${cfg["name"] || campaignId} — scan #${duel["scan_seq"]}`,
        description: "Duel de course · DKP de course (domaine coalition, BR-010)",
        color,
        fields,
        footer: {text: "Kingdom Manager · KvK Race"},
        timestamp: meta && meta.scanTs ? new Date(meta.scanTs).toISOString() : new Date().toISOString(),
    };
}

/**
 * Poste le snapshot du duel dans le salon configuré, si tout est réuni.
 * Ne lève jamais : renvoie un statut pour la journalisation et les tests.
 *
 * @param {object} p paramètres
 * @param {string} p.campaignId identifiant de campagne
 * @param {object} p.cfg configuration de campagne, lue avant l'appel
 * @param {object} p.data sortie de buildAll (duel, metas)
 * @param {Array} p.metas métadonnées des scans, triées par seq
 * @param {string} p.botToken jeton du bot Discord
 * @param {Function} p.markPosted callback pour mémoriser le seq publié
 * @return {Promise<{posted: boolean, reason?: string}>} statut
 */
export async function postDuelSnapshot({campaignId, cfg, data, metas, botToken, markPosted}) {
    const channelId = String(cfg["discord_channel_id"] || "").trim();

    if (!channelId) return {posted: false, reason: "no-channel"};
    if (cfg["discord_snapshot_enabled"] === false) return {posted: false, reason: "disabled"};
    if (!botToken) {
        logger.warn(`[${campaignId}] snapshot Discord : DISCORD_BOT_TOKEN absent`);
        return {posted: false, reason: "no-token"};
    }

    const duels = (data.duel || []).slice().sort((a, b) => a["scan_seq"] - b["scan_seq"]);
    const duel = duels[duels.length - 1];
    if (!duel) return {posted: false, reason: "no-duel"};

    // Le scan de base ne porte aucun net : il n'y a rien à annoncer.
    if (data.baseSeq != null && duel["scan_seq"] === data.baseSeq) {
        return {posted: false, reason: "base-scan"};
    }

    // Idempotence : re-digestion ou retry ne republient pas le même scan.
    if (cfg["lastSnapshotSeq"] != null && Number(cfg["lastSnapshotSeq"]) >= Number(duel["scan_seq"])) {
        return {posted: false, reason: "already-posted"};
    }

    const embed = buildDuelEmbed({
        campaignId,
        cfg,
        duel,
        previousDuel: duels[duels.length - 2] || null,
        meta: (metas || []).find((m) => m.scanSeq === duel["scan_seq"]) || null,
    });

    try {
        const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${botToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({embeds: [embed]}),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => "");
            logger.error(`[${campaignId}] snapshot Discord refusé (${res.status}) : ${body.slice(0, 300)}`);
            return {posted: false, reason: `http-${res.status}`};
        }

        if (markPosted) await markPosted(duel["scan_seq"]);
        logger.info(`[${campaignId}] snapshot Discord publié pour le scan ${duel["scan_seq"]}`);
        return {posted: true};
    } catch (err) {
        // Une panne Discord ne doit jamais faire échouer une digestion réussie.
        logger.error(`[${campaignId}] snapshot Discord en échec : ${err.message}`);
        return {posted: false, reason: "exception"};
    }
}
