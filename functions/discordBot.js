import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
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
 * Returns { governorId, role } or null if the user is not found / not linked.
 * Warrior+ check: the user must have a user_profiles document with a governorId.
 */
async function resolvePlayer(discordId, db) {
    logger.info(`[resolvePlayer] Looking up discordId: ${discordId}`);
    const discordUid = `discord:${discordId}`;

    // Run all 3 queries concurrently to save time (Discord has a 3s timeout)
    const [snap, snap2, ssoDocRef] = await Promise.all([
        db.collection("user_profiles").where("discordId", "==", discordId).limit(1).get(),
        db.collection("user_profiles").where("discordUid", "==", discordUid).limit(1).get(),
        db.collection("user_profiles").doc(discordUid).get()
    ]);

    // Primary lookup: discordId field stores the raw numeric Discord ID string
    if (!snap.empty) {
        const data = snap.docs[0].data();
        const governorId = data.governorId || data.governor_id || null;
        if (governorId) {
            logger.info(`[resolvePlayer] Found via discordId. governorId=${governorId}`);
            return { governorId: String(governorId), role: data.role || "Warrior" };
        }
    }

    // Fallback: some profiles may store "discord:ID" format in discordUid
    if (!snap2.empty) {
        const data = snap2.docs[0].data();
        const governorId = data.governorId || data.governor_id || null;
        if (governorId) {
            logger.info(`[resolvePlayer] Found via discordUid. governorId=${governorId}`);
            return { governorId: String(governorId), role: data.role || "Warrior" };
        }
    }

    // Fallback 3: Look up by document ID directly!
    // Standalone Discord SSO users have UID = discordUid
    if (ssoDocRef.exists) {
        const data = ssoDocRef.data();
        const governorId = data.governorId || data.governor_id || null;
        if (governorId) {
            logger.info(`[resolvePlayer] Found via document ID (discordUid). governorId=${governorId}`);
            return { governorId: String(governorId), role: data.role || "Warrior" };
        }
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
    if (!doc.exists) return null;
    const list = doc.data()?.list || [];
    return list.find((p) => String(p.id) === String(governorId)) || null;
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
    return main || filler;
}

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
 * Build the /mystats embed — full player view
 */
async function buildMyStatsEmbed(discordId, db) {
    const profile = await resolvePlayer(discordId, db);

    if (!profile) {
        return { embeds: [buildAccessDeniedEmbed()], flags: 64 }; // 64 = ephemeral
    }

    const { governorId } = profile;

    const [player, kvk] = await Promise.all([
        loadPlayerData(governorId, db),
        loadKvKData(governorId, db),
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
                fields,
                footer: {
                    text: `KD 2997 — Kingdom Manager`,
                },
                timestamp: new Date().toISOString(),
            },
        ],
    };
}

/**
 * Build the /mykvk embed — KvK-focused view
 */
async function buildMyKvKEmbed(discordId, db) {
    const profile = await resolvePlayer(discordId, db);

    if (!profile) {
        return { embeds: [buildAccessDeniedEmbed()], flags: 64 };
    }

    const { governorId } = profile;
    const kvk = await loadKvKData(governorId, db);

    if (!kvk) {
        // Still show who the player is, but no data
        const player = await loadPlayerData(governorId, db);
        return {
            embeds: [
                {
                    color: 0x6366f1,
                    title: `⚔️ KvK Stats — ${player?.name || "Player"}`,
                    description: `Governor ID: \`${governorId}\`\n\n_No KvK data available. Data is uploaded by officers after each KvK._`,
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
                description: `Governor ID: \`${governorId}\``,
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
                footer: { text: "KD 2997 — Kingdom Manager" },
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
                } else if (commandName === "mykvk") {
                    responseData = await buildMyKvKEmbed(discordId, db);
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
