import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import {computeKvkGoals, rateFromGoalPct, DEAD_POINTS_PER_T5} from "./kvkGoals.js";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import nacl from "tweetnacl";
import { Buffer } from "node:buffer";

// The application's Public Key, found in the Discord Developer Portal
const DISCORD_PUBLIC_KEY = defineSecret("DISCORD_PUBLIC_KEY");

// --- Helpers ---

const fmt = (num) => {
    if (num === null || num === undefined || isNaN(Number(num))) return "N/A";
    return Number(num).toLocaleString("en-US");
};

const fmtM = (num) => {
    if (num === null || num === undefined || isNaN(Number(num))) return "N/A";
    const n = Number(num);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
};

const progressBar = (val) => {
    if (val === null || val === undefined) return "";
    const pct = typeof val === "number" ? val * 100 : parseFloat(val);
    if (isNaN(pct)) return "";
    const filled = Math.min(Math.round(pct / 10), 10);
    const empty = 10 - filled;
    // Use ASCII-safe chars — Unicode block chars (█░) render as boxes on some Discord clients
    return `[${"-".repeat(filled)}${" ".repeat(empty)}] ${pct.toFixed(0)}%`;
};

const fmtDiff = (num) => {
    if (num === null || num === undefined || isNaN(Number(num))) return "N/A";
    const n = Number(num);
    return n > 0 ? `+${fmt(n)}` : fmt(n);
};

/**
 * Returns an embed colour and emoji based on the KvK rate
 */
const rateStyle = (rate) => {
    if (!rate) return { color: 0x6366f1, emoji: "⚪" };
    const r = rate.toLowerCase();
    if (r === "excellent") return { color: 0x8b5cf6, emoji: "🟣" };
    if (r === "good" || r === "great") return { color: 0x10b981, emoji: "🟢" };
    if (r === "need improvement" || r === "average" || r === "ok") return { color: 0xf59e0b, emoji: "🟡" };
    if (r === "dead weight" || r === "bad" || r === "poor") return { color: 0xef4444, emoji: "🔴" };
    return { color: 0x6366f1, emoji: "⚪" };
};

/**
 * Verify Discord's Ed25519 signature to prevent spoofing.
 */
function verifyDiscordSignature(publicKey, signature, timestamp, body) {
    try {
        return nacl.sign.detached.verify(
            Buffer.from(timestamp + body),
            Buffer.from(signature, "hex"),
            Buffer.from(publicKey, "hex")
        );
    } catch {
        return false;
    }
}

/**
 * Lookup a player profile from Firestore by Discord ID.
 * Returns { governorId } or null if the user is not found / not linked.
 * Warrior+ check: the user must have a user_profiles document with a governorId.
 *
 * Sécurité (audit BUG-002, constat H-1) : `discordId` et `discordUid` sont des
 * champs de document, pas des identités prouvées. Ils ne sont plus écrivables par
 * le client depuis le durcissement des règles (Functions uniquement), mais des
 * valeurs antérieures peuvent subsister. Deux garde-fous :
 *
 *   1. l'ID de document `discord:<id>` est la seule identité que Discord ait
 *      réellement signée — il est consulté en premier ;
 *   2. les recherches par champ refusent de répondre si plusieurs documents
 *      correspondent, au lieu de renvoyer le premier venu dans un ordre non
 *      spécifié : c'est exactement ce qu'exploitait le scénario d'usurpation.
 *
 * Le champ `role` n'est plus renvoyé : il était lu depuis un document autrefois
 * écrivable par le client, et aucun appelant ne l'utilisait.
 */
async function resolvePlayer(discordId, db) {
    logger.info(`[resolvePlayer] Looking up discordId: ${discordId}`);
    const discordUid = `discord:${discordId}`;

    const governorOf = (data) => {
        const governorId = data.governorId || data.governor_id || null;
        return governorId ? String(governorId) : null;
    };

    // Une seule correspondance attendue : limit(2) sert à détecter l'ambiguïté.
    const single = (snap, field) => {
        if (snap.empty) return null;
        if (snap.size > 1) {
            logger.error(
                `[resolvePlayer] AMBIGU : ${snap.size} profils portent ${field}=${discordId}. ` +
                `Résolution refusée (usurpation possible — voir BUG-002 / H-1). ` +
                `Documents : ${snap.docs.map((d) => d.id).join(", ")}`
            );
            return null;
        }
        return governorOf(snap.docs[0].data());
    };

    // Run all 3 lookups concurrently to save time (Discord has a 3s timeout)
    const [ssoDocRef, snap, snap2] = await Promise.all([
        db.collection("user_profiles").doc(discordUid).get(),
        db.collection("user_profiles").where("discordId", "==", discordId).limit(2).get(),
        db.collection("user_profiles").where("discordUid", "==", discordUid).limit(2).get()
    ]);

    // 1. Identité de confiance : l'ID du document EST l'UID Firebase émis par le
    // SSO Discord. Les comptes Discord natifs passent tous par là.
    if (ssoDocRef.exists) {
        const governorId = governorOf(ssoDocRef.data());
        if (governorId) {
            logger.info(`[resolvePlayer] Found via document ID (discordUid). governorId=${governorId}`);
            return { governorId };
        }
    }

    // 2. Comptes Google liés à Discord : l'ID du document est l'UID Google, la
    // correspondance passe donc par un champ écrit par confirmDiscordLink.
    const byField = single(snap, "discordId");
    if (byField) {
        logger.info(`[resolvePlayer] Found via discordId. governorId=${byField}`);
        return { governorId: byField };
    }

    // 3. Même cas, ancien format "discord:ID" stocké dans discordUid.
    const byLegacyField = single(snap2, "discordUid");
    if (byLegacyField) {
        logger.info(`[resolvePlayer] Found via discordUid. governorId=${byLegacyField}`);
        return { governorId: byLegacyField };
    }

    // Still not found or no governor linked
    logger.warn(`[resolvePlayer] No user_profiles doc found or no governor linked for discordId=${discordId}`);
    return null;
}

/**
 * Load the full player list from Firestore static_data.
 * We fetch the full doc once (compressed blob) and filter in-memory.
 */
async function loadPlayerData(governorId, db) {
    const doc = await db.collection("static_data").doc("players").get();
    if (!doc.exists) return { player: null, updatedAt: null };
    const data = doc.data();
    return {
        player: (data?.list || []).find((p) => String(p.id) === String(governorId)) || null,
        updatedAt: data?.updatedAt || null,
    };
}

/**
 * Load KvK stats for a given governorId.
 */
async function loadKvKData(governorId, db) {
    const [kvkDoc, fillerDoc] = await Promise.all([
        db.collection("static_data").doc("kvk").get(),
        db.collection("static_data").doc("kvk_filler").get(),
    ]);

    const kvkList = kvkDoc.exists ? (kvkDoc.data()?.list || []) : [];
    const fillerList = fillerDoc.exists ? (fillerDoc.data()?.list || []) : [];

    const main = kvkList.find((p) => String(p.id) === String(governorId)) || null;
    const filler = fillerList.find((p) => String(p.id) === String(governorId)) || null;

    // Prefer main, fallback to filler
    return {
        kvk: main || filler,
        updatedAt: (main ? kvkDoc.data()?.updatedAt : fillerDoc.data()?.updatedAt) || null,
    };
}

/**
 * US-014 — Archived campaigns (kvk_history). Small module-level cache: the
 * autocomplete fires on every keystroke and Discord expects a <3s answer.
 */
let campaignIndexCache = { at: 0, list: [] };

async function loadCampaignIndex(db) {
    if (Date.now() - campaignIndexCache.at < 5 * 60 * 1000 && campaignIndexCache.list.length) {
        return campaignIndexCache.list;
    }
    const snap = await db.collection("kvk_history")
        .select("title", "order", "startDate", "endDate", "outcome")
        .get();
    const list = snap.docs
        .map((d) => {
            const x = d.data();
            const year = x.startDate ? String(x.startDate).slice(0, 4) : null;
            return {
                docId: d.id,
                title: x.title || d.id,
                order: x.order || 0,
                outcome: x.outcome || null,
                label: `${x.title || d.id}${year && !(x.title || "").includes(year) ? ` (${year})` : ""}`,
            };
        })
        .sort((a, b) => b.order - a.order);
    campaignIndexCache = { at: Date.now(), list };
    return list;
}

const outcomeLabel = (o) =>
    o === "victory_star" ? "🏆⭐ Victory (with star)"
        : o === "victory" ? "🏆 Victory"
            : o === "defeat" ? "☠️ Defeat"
                : null;

/**
 * Load a governor's entry from an archived campaign (US-014).
 * Returns null if the campaign doc does not exist.
 */
async function loadKvKHistoryData(governorId, campaignId, db) {
    const doc = await db.collection("kvk_history").doc(campaignId).get();
    if (!doc.exists) return null;
    const data = doc.data();
    const main = (data.list || []).find((p) => String(p.id) === String(governorId)) || null;
    const filler = (data.fillerList || []).find((p) => String(p.id) === String(governorId)) || null;
    return {
        campaign: {
            title: data.title || campaignId,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            outcome: data.outcome || null,
            archivedAt: data.archivedAt || null,
        },
        kvk: main || filler,
        isFiller: !main && !!filler,
    };
}

/**
 * Load the freshest known avatar URL for a governor (static_data/avatars,
 * maintained by syncAvatars — lilith CDN first, Discord fallback).
 */
async function loadAvatarUrl(governorId, db) {
    try {
        const doc = await db.collection("static_data").doc("avatars").get();
        return doc.exists ? (doc.data()?.map?.[String(governorId)]?.url || null) : null;
    } catch {
        return null;
    }
}

// "2026-07-11T20:59:23.814Z" -> "2026-07-11"; stale data must be visible as such
const fmtDataDate = (iso) => (iso ? String(iso).split("T")[0] : "unknown");

const dataFooter = (parts) =>
    `KD 2997 — Kingdom Manager  •  ${parts.map(([label, iso]) => `${label}: ${fmtDataDate(iso)}`).join("  •  ")}`;

// --- Embed Builders ---

function buildAccessDeniedEmbed() {
    return {
        color: 0xef4444,
        title: "🔒 Access Denied",
        description:
            "Your Discord account is not linked to a KD 2997 profile.\n\n" +
            "**To access your stats:**\n" +
            "1. Log in at [kd-97-manager.web.app](https://kd-97-manager.web.app)\n" +
            "2. Go to your **Profile** and link your Discord account\n" +
            "3. Run this command again",
        footer: { text: "KD 2997 — Kingdom Manager" },
    };
}

function buildPlayerNotFoundEmbed(governorId) {
    return {
        color: 0xf59e0b,
        title: "⚠️ Player Not Found",
        description: `Your Governor ID \`${governorId}\` is linked to your account, but does not appear in the database yet.\n\nData is synced from Google Sheets. Make sure your profile is in the Top 300 or contact an officer.`,
        footer: { text: "KD 2997 — Kingdom Manager" },
    };
}

/**
 * Build the /mykvkgoals embed — F-014 / US-009.
 *
 * Affiche le statut ABSOLU (seuils fixes sur le taux d'atteinte du KP Goal) et non
 * la note relative de fin de campagne : un objectif qui dépendrait des performances
 * des autres n'aiderait personne à savoir quoi faire aujourd'hui.
 *
 * @param {string} discordId identifiant Discord de l'appelant
 * @param {object} db Firestore
 * @return {Promise<object>} réponse d'interaction
 */
async function buildMyKvKGoalsEmbed(discordId, db) {
    const profile = await resolvePlayer(discordId, db);
    if (!profile) return {embeds: [buildAccessDeniedEmbed()], flags: 64};

    const {governorId} = profile;
    const [{player, updatedAt: playerUpdatedAt}, {kvk, updatedAt: kvkUpdatedAt}] = await Promise.all([
        loadPlayerData(governorId, db),
        loadKvKData(governorId, db),
    ]);

    if (!player && !kvk) return {embeds: [buildPlayerNotFoundEmbed(governorId)], flags: 64};

    // Puissance de début de campagne : le barème est calé dessus, et elle ne bouge
    // plus une fois le KvK lancé — sinon l'objectif baisserait à mesure des pertes.
    const power = kvk?.initialPower || player?.power || 0;
    const goals = computeKvkGoals(power);

    const kpGained = kvk?.totalKpGained ?? null;
    const goalPct = (kpGained !== null && goals.goalKp > 0) ?
        kpGained / (goals.goalKp * 1e6) :
        null;
    const {rate, uncertain} = rateFromGoalPct(goalPct);

    const RATE_COLORS = {
        "Excellent": 0x10b981,
        "Good": 0x6366f1,
        "Need Improvement": 0xf59e0b,
        "Dead Weight": 0xef4444,
    };

    const fields = [
        {
            name: "🎯 YOUR TARGETS",
            value: [
                `**Minimum KP**  •  \`${goals.minKp.toFixed(1)}M\``,
                `**KP Goal**  •  \`${goals.goalKp.toFixed(1)}M\``,
                `**Minimum deads**  •  \`${goals.minDead.toFixed(1)}M pts\`` +
                    `  (≈ ${Math.round(goals.minDeadApproxTroops / 1000)}k T5 troops)`,
            ].join("\n"),
            inline: false,
        },
    ];

    if (goalPct !== null) {
        fields.push({
            name: "📊 WHERE YOU STAND",
            value: [
                `**KP gained**  •  \`${fmt(kpGained)}\``,
                `**Goal reached**  •  \`${(goalPct * 100).toFixed(0)}%\``,
                rate ? `**Status**  •  \`${rate}\`` : null,
            ].filter(Boolean).join("\n"),
            inline: false,
        });
    } else {
        fields.push({
            name: "📊 WHERE YOU STAND",
            value: "No campaign data yet — targets only.",
            inline: false,
        });
    }

    const notes = [];
    if (goals.outOfDomain) {
        notes.push("⚠️ Your power is below the scale's reliable range — figures are indicative.");
    } else if (goals.outsideValidatedRange) {
        notes.push("⚠️ Your power is outside last season's observed range — figures are extrapolated.");
    }
    if (uncertain) {
        notes.push("⚠️ You are in the band where Good and Excellent overlapped last season.");
    }
    notes.push(`ℹ️ Deads are counted in points (~${DEAD_POINTS_PER_T5} per T5 dead). Losing T4s costs more troops for the same points.`);
    fields.push({name: "​", value: notes.join("\n"), inline: false});

    return {
        embeds: [{
            color: RATE_COLORS[rate] || 0x94a3b8,
            title: "🎯 Your KvK Goals",
            description: `Governor \`${governorId}\`  •  reference power \`${goals.powerM.toFixed(1)}M\``,
            fields,
            footer: {text: dataFooter([["players", playerUpdatedAt], ["kvk", kvkUpdatedAt]])},
        }],
        flags: 64,
    };
}

/**
 * Build the /mystats embed — full player view
 */
async function buildMyStatsEmbed(discordId, db) {
    const profile = await resolvePlayer(discordId, db);

    if (!profile) {
        return { embeds: [buildAccessDeniedEmbed()], flags: 64 }; // 64 = ephemeral
    }

    const { governorId } = profile;

    const [{ player, updatedAt: playerUpdatedAt }, { kvk, updatedAt: kvkUpdatedAt }, avatarUrl] = await Promise.all([
        loadPlayerData(governorId, db),
        loadKvKData(governorId, db),
        loadAvatarUrl(governorId, db),
    ]);

    if (!player) {
        return { embeds: [buildPlayerNotFoundEmbed(governorId)], flags: 64 };
    }

    const { color } = rateStyle(kvk?.rate);

    const fields = [];

    // Section 1: General Profile
    fields.push(
        {
            name: "⚡ GENERAL PROFILE",
            value: [
                `**Power**  •  \`${fmt(player.power)}\``,
                player.powerDiff !== undefined && player.powerDiff !== 0
                    ? `**Δ Power**  •  \`${fmtDiff(player.powerDiff)}\``
                    : null,
                `**Kill Points**  •  \`${fmt(player.kp)}\``,
                player.cityHall ? `**City Hall**  •  \`Lv. ${player.cityHall}\`` : null,
            ]
                .filter(Boolean)
                .join("\n"),
            inline: false,
        }
    );

    // Section 2: Combat Lifetime
    fields.push({
        name: "⚔️ COMBAT (lifetime)",
        value: [
            `**T5 Kills**  •  \`${fmt(player.t5Kills)}\``,
            `**T4 Kills**  •  \`${fmt(player.t4Kills)}\``,
            `**T1 Kills**  •  \`${fmt(player.t1Kills)}\``,
            `**Deads**  •  \`${fmt(player.deads)}\``,
        ]
            .filter(Boolean)
            .join("\n"),
        inline: true,
    });

    // Section 3: Economy
    fields.push({
        name: "🏗️ ECONOMY",
        value: [
            `**RSS Assistance**  •  \`${fmtM(player.rssAssistance)}\``,
            `**RSS Gathered**  •  \`${fmtM(player.rssGathered)}\``,
            `**City Helps**  •  \`${fmt(player.helps)}\``,
        ]
            .filter(Boolean)
            .join("\n"),
        inline: true,
    });

    // Section 4: Last KvK (optional)
    if (kvk) {
        const goalPct = typeof kvk.goalPercent === "number" ? kvk.goalPercent * 100 : parseFloat(kvk.goalPercent);
        const { emoji: rateEmoji } = rateStyle(kvk.rate);
        fields.push({
            name: "📊 LAST KvK",
            value: [
                `**Power**  •  \`${fmtM(kvk.initialPower)}\` → \`${fmtM(kvk.finalPower)}\``,
                `**KP**  •  \`${fmtM(kvk.initialKp)}\` → \`${fmtM(kvk.finalKp)}\``,
                `**KP Gained**  •  \`+${fmt(kvk.totalKpGained)}\``,
                `**Deaths**  •  \`${fmt(kvk.totalDead)}\``,
                !isNaN(goalPct)
                    ? `**Goal**  •  \`${goalPct.toFixed(1)}%\`  ${progressBar(kvk.goalPercent)}`
                    : null,
                kvk.rate ? `**Rating**  •  ${rateEmoji} **${kvk.rate}**` : null,
            ]
                .filter(Boolean)
                .join("\n"),
            inline: false,
        });
    } else {
        fields.push({
            name: "📊 LAST KvK",
            value: "_No KvK data available for this player._",
            inline: false,
        });
    }

    return {
        embeds: [
            {
                color,
                title: `👑 ${player.name || "Joueur inconnu"}${player.alliance ? `  ·  ${player.alliance}` : ""}`,
                description: `Governor ID: \`${governorId}\``,
                ...(avatarUrl ? { thumbnail: { url: avatarUrl } } : {}),
                fields,
                footer: {
                    text: dataFooter([["Profile data", playerUpdatedAt], ["KvK data", kvkUpdatedAt]]),
                },
                timestamp: new Date().toISOString(),
            },
        ],
    };
}

/**
 * Build the /mykvk embed — KvK-focused view.
 * US-014: an optional campaignId targets an archived campaign from kvk_history
 * instead of the live static_data documents.
 */
async function buildMyKvKEmbed(discordId, db, campaignId = null) {
    const profile = await resolvePlayer(discordId, db);

    if (!profile) {
        return { embeds: [buildAccessDeniedEmbed()], flags: 64 };
    }

    const { governorId } = profile;

    let kvk, kvkUpdatedAt, campaign = null, isFiller = false;
    if (campaignId && campaignId !== "current") {
        const hist = await loadKvKHistoryData(governorId, campaignId, db);
        if (!hist) {
            return {
                embeds: [{
                    color: 0xf59e0b,
                    title: "⚠️ Campaign Not Found",
                    description: `No archived campaign matches \`${campaignId}\`. Use the autocomplete suggestions.`,
                    footer: { text: "KD 2997 — Kingdom Manager" },
                }],
                flags: 64,
            };
        }
        ({ kvk, campaign, isFiller } = hist);
        kvkUpdatedAt = hist.campaign.archivedAt;
    } else {
        ({ kvk, updatedAt: kvkUpdatedAt } = await loadKvKData(governorId, db));
    }

    // Campaign context lines shown under the Governor ID (archived lookups only)
    const campaignDesc = campaign
        ? [
            `📜 **${campaign.title}**${isFiller ? "  ·  _filler account_" : ""}`,
            (campaign.startDate || campaign.endDate)
                ? `🗓️ ${campaign.startDate || "…"} → ${campaign.endDate || "…"}`
                : null,
            outcomeLabel(campaign.outcome),
        ].filter(Boolean).join("\n")
        : null;

    if (!kvk) {
        // Still show who the player is, but no data
        const { player } = await loadPlayerData(governorId, db);
        const reason = campaign
            ? `_No data for this governor in **${campaign.title}** — the account did not take part in that campaign (or was not scanned)._`
            : "_No KvK data available. Data is uploaded by officers after each KvK._";
        return {
            embeds: [
                {
                    color: 0x6366f1,
                    title: `⚔️ KvK Stats — ${player?.name || "Player"}`,
                    description: `Governor ID: \`${governorId}\`\n\n${reason}`,
                    footer: { text: "KD 2997 — Kingdom Manager" },
                    timestamp: new Date().toISOString(),
                },
            ],
        };
    }

    const { color, emoji } = rateStyle(kvk.rate);
    const goalPct = typeof kvk.goalPercent === "number" ? kvk.goalPercent * 100 : parseFloat(kvk.goalPercent);
    const bar = progressBar(kvk.goalPercent);

    const powerDiff = (kvk.finalPower || 0) - (kvk.initialPower || 0);
    const kpGained = kvk.totalKpGained || ((kvk.finalKp || 0) - (kvk.initialKp || 0));

    return {
        embeds: [
            {
                color,
                title: `⚔️ KvK Stats — ${kvk.name || "Unknown Player"}`,
                description: `Governor ID: \`${governorId}\`` + (campaignDesc ? `\n${campaignDesc}` : ""),
                fields: [
                    {
                        name: "📈 POWER",
                        value: [
                            `**Start**  •  \`${fmt(kvk.initialPower)}\``,
                            `**End**  •  \`${fmt(kvk.finalPower)}\``,
                            `**Change**  •  \`${fmtDiff(powerDiff)}\``,
                        ].join("\n"),
                        inline: true,
                    },
                    {
                        name: "🗡️ KILL POINTS",
                        value: [
                            `**Start**  •  \`${fmt(kvk.initialKp)}\``,
                            `**End**  •  \`${fmt(kvk.finalKp)}\``,
                            `**KP Gained**  •  \`+${fmt(kpGained)}\``,
                        ].join("\n"),
                        inline: true,
                    },
                    {
                        name: "💀 RESULTS",
                        value: [
                            `**Total Deaths**  •  \`${fmt(kvk.totalDead)}\``,
                            !isNaN(goalPct)
                                ? `**Goal %**  •  \`${goalPct.toFixed(1)}%\`\n\`${bar}\``
                                : null,
                            kvk.rate
                                ? `**Rating**  •  ${emoji} **${kvk.rate}**`
                                : null,
                        ]
                            .filter(Boolean)
                            .join("\n"),
                        inline: false,
                    },
                ],
                footer: { text: dataFooter([[campaign ? "Archived" : "KvK data", kvkUpdatedAt]]) },
                timestamp: new Date().toISOString(),
            },
        ],
    };
}

// --- Main Interactions Handler ---

export const discordInteractionHandler = onRequest(
    {
        secrets: [DISCORD_PUBLIC_KEY],
        // No CORS needed — Discord calls this server-side
    },
    async (req, res) => {
        // Only accept POST
        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        const signature = req.headers["x-signature-ed25519"];
        const timestamp = req.headers["x-signature-timestamp"];

        // Firebase Functions v2 provides req.rawBody as a Buffer when the body is not yet parsed.
        // If rawBody is available use it directly; otherwise fall back to the parsed body serialized.
        // IMPORTANT: Discord signs the exact bytes it sends, which are always valid JSON.
        // JSON.stringify(req.body) produces a semantically equivalent but potentially
        // byte-different string — this WILL cause signature failures in production.
        // The correct approach is to consume the raw bytes before Express parses them.
        // Firebase Functions v2 exposes req.rawBody (Buffer) when middleware hasn't consumed it.
        const rawBody = req.rawBody
            ? req.rawBody.toString("utf8")
            : JSON.stringify(req.body);

        // 1. Verify Discord signature
        if (!signature || !timestamp) {
            logger.warn("Missing Discord signature headers");
            return res.status(401).send("Unauthorized");
        }

        const publicKey = DISCORD_PUBLIC_KEY.value().trim();
        const isValid = verifyDiscordSignature(publicKey, signature, timestamp, rawBody);

        if (!isValid) {
            logger.warn("Invalid Discord signature");
            return res.status(401).send("Unauthorized");
        }

        const body = req.body;

        // 2. Handle PING (type 1) — required by Discord for endpoint validation
        if (body.type === 1) {
            return res.json({ type: 1 });
        }

        // 2b. Handle Autocomplete (type 4) — US-014: campaign picker for /mykvk
        if (body.type === 4) {
            try {
                if (body.data?.name === "mykvk") {
                    const db = getFirestore("kdmanagerdb");
                    const focused = (body.data.options || []).find((o) => o.focused);
                    const q = String(focused?.value || "").toLowerCase();
                    const campaigns = await loadCampaignIndex(db);
                    const choices = [
                        { name: "Current KvK (live data)", value: "current" },
                        ...campaigns.map((c) => ({ name: c.label, value: c.docId })),
                    ]
                        .filter((c) => !q || c.name.toLowerCase().includes(q))
                        .slice(0, 25);
                    return res.json({ type: 8, data: { choices } });
                }
            } catch (error) {
                logger.error("Autocomplete error:", error);
            }
            return res.json({ type: 8, data: { choices: [] } });
        }

        // 3. Handle Slash Commands (type 2)
        if (body.type === 2) {
            const commandName = body.data?.name;
            const discordId = body.member?.user?.id || body.user?.id;

            if (!discordId) {
                logger.error("Could not resolve Discord user ID from interaction", body);
                return res.json({
                    type: 4,
                    data: {
                        content: "❌ Unable to identify your Discord account.",
                        flags: 64,
                    },
                });
            }

            logger.info(`Slash command /${commandName} from Discord user ${discordId}`);

            const db = getFirestore("kdmanagerdb");

            try {
                let responseData;

                if (commandName === "mystats") {
                    responseData = await buildMyStatsEmbed(discordId, db);
                } else if (commandName === "mykvkgoals") {
                    responseData = await buildMyKvKGoalsEmbed(discordId, db);
                } else if (commandName === "mykvk") {
                    // US-014: optional "campaign" option targets an archived KvK
                    const campaignOpt = (body.data?.options || []).find((o) => o.name === "campaign");
                    responseData = await buildMyKvKEmbed(discordId, db, campaignOpt?.value || null);
                } else {
                    responseData = {
                        content: `❓ Unknown command \`/${commandName}\`.`,
                        flags: 64,
                    };
                }

                return res.json({ type: 4, data: responseData });

            } catch (error) {
                logger.error(`Error processing /${commandName} for user ${discordId}:`, error);
                return res.json({
                    type: 4,
                    data: {
                        content: "❌ An error occurred while processing your command. Please try again in a moment.",
                        flags: 64,
                    },
                });
            }
        }

        // 4. Unhandled interaction type
        logger.warn("Unhandled interaction type:", body.type);
        return res.status(400).send("Unhandled interaction type");
    }
);
