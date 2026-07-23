#!/usr/bin/env node
/**
 * deploy-discord-commands.mjs
 *
 * One-shot script to register the KD 2997 Slash Commands with Discord.
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=<token> DISCORD_CLIENT_ID=<app_id> DISCORD_GUILD_ID=<guild_id> node scripts/deploy-discord-commands.mjs
 *
 * If DISCORD_GUILD_ID is provided, commands are registered to that guild (instant, recommended for testing).
 * If omitted, commands are registered globally (can take up to 1 hour to propagate).
 *
 * Required env vars:
 *   DISCORD_BOT_TOKEN    — Bot token from Discord Developer Portal
 *   DISCORD_CLIENT_ID    — Application ID from Discord Developer Portal
 *   DISCORD_GUILD_ID     — (Optional) Guild / Server ID for guild-scoped registration
 */

import { writeFileSync } from "fs";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // optional

if (!BOT_TOKEN || !CLIENT_ID) {
    console.error("❌ Missing required environment variables: DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID");
    process.exit(1);
}

const commands = [
    {
        name: "mystats",
        description: "View your complete KD 2997 stats (Power, KP, Combat, Economy, last KvK)",
    },
    {
        name: "mykvkgoals",
        description: "View your individual KvK targets (Minimum KP, KP Goal, deads) and your status (US-009)",
    },
    {
        name: "mykvk",
        description: "View your KvK performance — current campaign or a past one (US-014)",
        options: [
            {
                type: 3, // STRING
                name: "campaign",
                description: "Past campaign to look up (default: current KvK)",
                required: false,
                autocomplete: true,
            },
        ],
    },
];

const endpoint = GUILD_ID
    ? `https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`;

console.log(`\n🚀 Registering ${commands.length} slash commands...`);
console.log(`   Scope: ${GUILD_ID ? `Guild (${GUILD_ID})` : "Global"}`);
console.log(`   Endpoint: ${endpoint}\n`);

const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
        "Authorization": `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
});

if (!response.ok) {
    const err = await response.text();
    console.error(`❌ Discord API error ${response.status}:`, err);
    process.exit(1);
}

const result = await response.json();

console.log(`✅ ${result.length} command(s) registered successfully:\n`);
for (const cmd of result) {
    console.log(`   /${cmd.name}  [ID: ${cmd.id}]`);
    console.log(`   ${cmd.description}\n`);
}

console.log("📋 Next steps:");
console.log("   1. Deploy the Cloud Function: firebase deploy --only functions:discordInteractionHandler");
console.log("   2. Set the Interactions Endpoint URL in Discord Developer Portal:");
console.log(`      https://us-central1-kd-97-manager.cloudfunctions.net/discordInteractionHandler`);
console.log("   3. Make sure the DISCORD_PUBLIC_KEY secret is set in Firebase:");
console.log("      firebase functions:secrets:set DISCORD_PUBLIC_KEY");
