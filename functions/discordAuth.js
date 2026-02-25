import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { defineString, defineSecret } from 'firebase-functions/params';
import { Buffer } from 'node:buffer';

// Secret Parameters (to be defined via firebase functions:secrets:set)
const DISCORD_CLIENT_ID = defineSecret('DISCORD_CLIENT_ID');
const DISCORD_CLIENT_SECRET = defineSecret('DISCORD_CLIENT_SECRET');

// Discord Bot Secrets for Role Sync
const DISCORD_BOT_TOKEN = defineSecret('DISCORD_BOT_TOKEN');
const DISCORD_GUILD_ID = defineSecret('DISCORD_GUILD_ID');
const DISCORD_ROLE_KING = defineSecret('DISCORD_ROLE_KING');
const DISCORD_ROLE_OFFICER = defineSecret('DISCORD_ROLE_OFFICER');
const DISCORD_ROLE_WARRIOR = defineSecret('DISCORD_ROLE_WARRIOR');

// Redirect URI for Discord OAuth2. Must match what is set in Discord Developer Portal.
// In production, this should be the public URL of the discordCallback function, e.g.,
// https://<region>-<project-id>.cloudfunctions.net/discordCallback
const DISCORD_REDIRECT_URI = defineString('DISCORD_REDIRECT_URI', { default: 'http://localhost:5173/api/discordCallback' });

/**
 * Step 1: Redirect user to Discord for authorization
 */
export const discordLogin = onRequest({ secrets: [DISCORD_CLIENT_ID] }, async (req, res) => {
    // Read action parameter (default to 'login')
    const action = req.query.action === 'link' ? 'link' : 'login';
    // Embed action into the state string
    const state = `${action}_` + Math.random().toString(36).substring(7);

    // Option: Encrypt the state or save it in a cookie for validation (skipped for basic implementation)
    // res.cookie('__session', state, { maxAge: 3600000, httpOnly: true, secure: true });

    const clientId = DISCORD_CLIENT_ID.value().trim();
    let redirectUri = DISCORD_REDIRECT_URI.value().trim();

    // Override with localhost if we are running locally (based on hostname)
    if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
        redirectUri = 'http://localhost:5173/api/discordCallback';
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'identify', // Add 'guilds' if you want role sync later without bot
        state: state
    }).toString();

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params}`;

    res.redirect(discordAuthUrl);
});

/**
 * Step 2: Handle callback from Discord, exchange code for token, and mint Firebase Custom Token
 */
export const discordCallback = onRequest({ cors: true, secrets: [DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_ROLE_KING, DISCORD_ROLE_OFFICER, DISCORD_ROLE_WARRIOR] }, async (req, res) => {
    const code = req.query.code;
    const state = req.query.state || '';
    const isLinking = state.startsWith('link_');

    if (!code) {
        logger.error('No code provided in callback');
        return res.status(400).send('No authorization code provided');
    }

    try {
        const codeString = code.toString();

        // --- ANTI-REPLAY CACHE ---
        const db = getFirestore("kdmanagerdb");
        const codeDocRef = db.collection('_discord_oauth_cache').doc(codeString);

        let isReplay = false;
        // Poll for up to 6 seconds (15 chunks of 400ms)
        for (let i = 0; i < 15; i++) {
            try {
                const cachedDoc = await codeDocRef.get();
                if (cachedDoc.exists) {
                    isReplay = true;
                    let frontendUrl = 'http://localhost:5173/#/profile'; // Link redirects to profile
                    if (req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
                        // We are in production
                        frontendUrl = 'https://kd-97-manager.web.app/#/profile';
                    }

                    if (cachedDoc.data().firebaseToken) {
                        logger.info("Anti-Replay Cache HIT! Returning cached token for code.");
                        const cachedToken = cachedDoc.data().firebaseToken;
                        const loginUrl = frontendUrl.replace('/#/profile', '/#/discord-auth');
                        return res.redirect(`${loginUrl}?token=${cachedToken}`);
                    } else if (cachedDoc.data().linkToken) {
                        logger.info("Anti-Replay Cache HIT! Returning cached linkToken for code.");
                        return res.redirect(`${frontendUrl}?linkToken=${cachedDoc.data().linkToken}`);
                    } else if (cachedDoc.data().status === 'processing') {
                        logger.info(`Anti-Replay Cache: Code being processed. Waiting 400ms (Attempt ${i})...`);
                        await new Promise(resolve => setTimeout(resolve, 400));
                        continue;
                    }
                } else {
                    // Does not exist, we are the first to claim this code
                    break;
                }
            } catch (err) {
                logger.error("Error reading anti-replay cache", err);
                break;
            }
        }

        if (isReplay) {
            return res.status(500).send("Login attempt timed out. Please try again.");
        }

        await codeDocRef.set({ status: 'processing', createdAt: FieldValue.serverTimestamp() });
        // -----------------------

        const clientId = DISCORD_CLIENT_ID.value().trim();
        const clientSecret = DISCORD_CLIENT_SECRET.value().trim();
        let redirectUri = DISCORD_REDIRECT_URI.value().trim();

        // Override with localhost if we are running in the local emulator
        if (req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
            redirectUri = 'http://localhost:5173/api/discordCallback';
        }

        logger.info("Discord Token Exchange Params:", {
            client_id: clientId,
            redirect_uri: redirectUri,
            code: code.toString(),
            grant_type: 'authorization_code'
        });

        // 1. Exchange code for access_token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code.toString(),
                redirect_uri: redirectUri
            }).toString()
        });

        if (!tokenResponse.ok) {
            const err = await tokenResponse.text();
            throw new Error(`Failed to get token from Discord: ${err}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 2. Get User Info from Discord
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!userResponse.ok) {
            const err = await userResponse.text();
            throw new Error(`Failed to get user info from Discord: ${err}`);
        }

        const userData = await userResponse.json();
        const discordUid = `discord:${userData.id}`;
        const displayName = userData.global_name || userData.username;
        const photoURL = userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null;

        // 3. Link or Sync Profile
        if (isLinking) {
            const linkToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
            await db.collection('_discord_link_tokens').doc(linkToken).set({
                discordId: userData.id,
                discordUid: discordUid,
                displayName: displayName,
                photoURL: photoURL,
                createdAt: FieldValue.serverTimestamp()
            });

            // Save linkToken to anti-replay cache
            await codeDocRef.update({ linkToken: linkToken });

            let frontendUrl = 'http://localhost:5173/#/profile';
            if (req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
                frontendUrl = 'https://kd-97-manager.web.app/#/profile';
            }
            return res.redirect(`${frontendUrl}?linkToken=${linkToken}`);
        }

        // --- LOGIN FLOW ---
        // Check if a Firebase user has linked this Discord ID
        const profilesRef = db.collection('user_profiles');
        const linkedSnap = await profilesRef.where('discordId', '==', userData.id).limit(1).get();

        let targetUid = discordUid;

        if (!linkedSnap.empty) {
            targetUid = linkedSnap.docs[0].id;
            logger.info(`Discord account ${userData.id} is linked to Firebase UID ${targetUid}. Minting token for linked account.`);
        } else {
            // Standard standalone Discord login
            try {
                await getAuth().getUser(discordUid);
                // Update existing user to keep avatar and name fresh
                await getAuth().updateUser(discordUid, {
                    displayName: displayName,
                    photoURL: photoURL
                });
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    // Create new user
                    await getAuth().createUser({
                        uid: discordUid,
                        displayName: displayName,
                        photoURL: photoURL
                    });
                } else {
                    throw error;
                }
            }
        }

        // 4. Mint Firebase Custom Token
        const firebaseToken = await getAuth().createCustomToken(targetUid, {
            discordId: userData.id
        });

        // 4.5 Background: Sync Roles from Discord asynchronously
        syncUserRolesFromDiscord(targetUid, userData.id).catch(err => {
            logger.error(`Failed to sync roles for ${targetUid} during login:`, err);
        });

        // 5. Redirect back to frontend
        let frontendAuthUrl = 'http://localhost:5173/#/discord-auth';
        if (req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
            frontendAuthUrl = 'https://kd-97-manager.web.app/#/discord-auth';
        }

        // Save token to anti-replay cache before redirecting
        await codeDocRef.update({ firebaseToken: firebaseToken });

        res.redirect(`${frontendAuthUrl}?token=${firebaseToken}`);
    } catch (error) {
        logger.error("Discord Auth Callback Error", error);

        // DUMP DIAGNOSTICS FOR THE USER TO COPY-PASTE (HIDING SECRET)
        const diagnosticDump = {
            message: "Authentication failed!",
            discord_error: error.message,
            code_received: req.query.code,
            client_id: DISCORD_CLIENT_ID.value().trim(),
            redirect_uri: DISCORD_REDIRECT_URI.value().trim()
        };

        res.status(500).type('json').send(JSON.stringify(diagnosticDump, null, 2));
    }
});

/**
 * Internal helper to sync a user's roles from Discord to Firestore
 */
async function syncUserRolesFromDiscord(uid, discordId) {
    const botToken = DISCORD_BOT_TOKEN.value().trim();
    const guildId = DISCORD_GUILD_ID.value().trim();
    const roleKing = DISCORD_ROLE_KING.value().trim();
    const roleOfficer = DISCORD_ROLE_OFFICER.value().trim();
    const roleWarrior = DISCORD_ROLE_WARRIOR.value().trim();

    if (!botToken || !guildId || !roleKing) {
        logger.warn("Discord Bot Token, Guild ID, or Roles are missing. Role sync skipped.");
        return null;
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
            headers: {
                'Authorization': `Bot ${botToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                logger.warn(`Discord User ${discordId} is not a member of guild ${guildId}`);
                // Demote to Guest if not in server? Safe default.
                return await updateFirestoreRole(uid, 'Guest');
            }
            const errText = await response.text();
            throw new Error(`Discord API error: ${response.status} ${errText}`);
        }

        const memberData = await response.json();
        const memberRoles = memberData.roles || [];

        let assignedRole = 'Guest';
        if (memberRoles.includes(roleKing)) {
            assignedRole = 'King';
        } else if (memberRoles.includes(roleOfficer)) {
            assignedRole = 'Officer';
        } else if (memberRoles.includes(roleWarrior)) {
            assignedRole = 'Warrior';
        }

        logger.info(`Mapped Discord roles for ${discordId} to Firebase Role: ${assignedRole}`);
        return await updateFirestoreRole(uid, assignedRole);

    } catch (error) {
        logger.error(`Error in syncUserRolesFromDiscord for ${discordId}:`, error);
        throw error;
    }
}

async function updateFirestoreRole(uid, role) {
    const db = getFirestore("kdmanagerdb");
    // Explicitly update the roles collection used by RoleContext
    await db.collection("roles").doc(uid).set({
        role: role,
        updatedAt: FieldValue.serverTimestamp(),
        source: 'discord_sync'
    }, { merge: true });
    return role;
}

/**
 * Callable Function to confirm and finalize the Discord Account Linking
 * The user must be logged into Firebase (e.g. via Google) to call this.
 */
export const confirmDiscordLink = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError('unauthenticated', 'Vous devez être connecté pour lier un compte Discord.');
    }

    const linkToken = request.data.linkToken;
    if (!linkToken) {
        throw new HttpsError('invalid-argument', 'Aucun jeton de liaison fourni.');
    }

    const db = getFirestore("kdmanagerdb");
    const tokenRef = db.collection('_discord_link_tokens').doc(linkToken);

    try {
        const doc = await tokenRef.get();
        if (!doc.exists) {
            throw new HttpsError('not-found', 'Jeton de liaison expiré ou invalide.');
        }

        const data = doc.data();

        // 1. Delete token to prevent reuse (Security)
        await tokenRef.delete();

        // 2. Write the Discord identity into the user's master profile
        const userProfileRef = db.collection('user_profiles').doc(uid);
        await userProfileRef.set({
            discordId: data.discordId,
            discordUid: data.discordUid,
            discordName: data.displayName,
            discordAvatar: data.photoURL,
            discordLinkedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // 3. Synchronize Discord Roles to Firebase Roles
        try {
            await syncUserRolesFromDiscord(uid, data.discordId);
        } catch (syncErr) {
            logger.warn(`Linking succeeded, but initial role sync failed for UID ${uid}: ${syncErr}`);
        }

        logger.info(`Successfully linked Discord account ${data.discordId} to Firebase user ${uid}`);

        return { success: true, message: "Compte Discord lié avec succès !" };

    } catch (error) {
        logger.error('Error confirming Discord link', error);
        throw new HttpsError('internal', 'Erreur lors de la liaison du compte.');
    }
});

/**
 * Callable Function to manually force a role synchronization from Discord
 */
export const forceRoleSync = onCall({
    cors: true,
    secrets: [DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_ROLE_KING, DISCORD_ROLE_OFFICER, DISCORD_ROLE_WARRIOR]
}, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError('unauthenticated', 'Vous devez être connecté pour synchroniser vos rôles.');
    }

    const db = getFirestore("kdmanagerdb");
    const userProfileDoc = await db.collection('user_profiles').doc(uid).get();

    let discordId = null;

    if (userProfileDoc.exists && userProfileDoc.data().discordId) {
        discordId = userProfileDoc.data().discordId;
    } else if (uid.startsWith('discord:')) {
        // Fallback for native SSO users who haven't populated a profile doc yet
        discordId = uid.replace('discord:', '');
    } else {
        throw new HttpsError('failed-precondition', 'Aucun compte Discord lié/reconnu trouvé. Veuillez lier votre compte Discord ou utiliser la connexion Discord.');
    }

    try {
        const assignedRole = await syncUserRolesFromDiscord(uid, discordId);
        return { success: true, role: assignedRole, message: "Rôles synchronisés avec succès depuis Discord !" };
    } catch (error) {
        logger.error(`[forceRoleSync] Detailed Error for UID ${uid}:`, error);
        throw new HttpsError('internal', `Échec de la communication avec le serveur Discord: ${error.message}`);
    }
});
