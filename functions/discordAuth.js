import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { defineString, defineSecret } from 'firebase-functions/params';
import { Buffer } from 'node:buffer';

// Secret Parameters (to be defined via firebase functions:secrets:set)
const DISCORD_CLIENT_ID = defineSecret('DISCORD_CLIENT_ID');
const DISCORD_CLIENT_SECRET = defineSecret('DISCORD_CLIENT_SECRET');

// Redirect URI for Discord OAuth2. Must match what is set in Discord Developer Portal.
// In production, this should be the public URL of the discordCallback function, e.g.,
// https://<region>-<project-id>.cloudfunctions.net/discordCallback
const DISCORD_REDIRECT_URI = defineString('DISCORD_REDIRECT_URI', { default: 'http://localhost:5173/api/discordCallback' });

/**
 * Step 1: Redirect user to Discord for authorization
 */
export const discordLogin = onRequest({ secrets: [DISCORD_CLIENT_ID] }, async (req, res) => {
    // Generate a random state string for CSRF protection
    const state = Math.random().toString(36).substring(7);

    // Option: Encrypt the state or save it in a cookie for validation (skipped for basic implementation)
    // res.cookie('__session', state, { maxAge: 3600000, httpOnly: true, secure: true });

    const clientId = DISCORD_CLIENT_ID.value().trim();
    const redirectUri = DISCORD_REDIRECT_URI.value().trim();

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'identify',
        state: state
    }).toString();

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params}`;

    res.redirect(discordAuthUrl);
});

/**
 * Step 2: Handle callback from Discord, exchange code for token, and mint Firebase Custom Token
 */
export const discordCallback = onRequest({ cors: true, secrets: [DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET] }, async (req, res) => {
    const code = req.query.code;
    // const state = req.query.state; // CSRF check skipped 

    // CSRF Check (if cookie was saved)
    // const cookieState = req.cookies && req.cookies.__session;
    // if (!cookieState || cookieState !== state) {
    //    logger.error('State mismatch', { cookieState, state });
    //    return res.status(401).send('State mismatch. Please try again.');
    // }

    if (!code) {
        logger.error('No code provided in callback');
        return res.status(400).send('No authorization code provided');
    }

    try {
        const codeString = code.toString();

        // --- ANTI-REPLAY CACHE ---
        // Antivirus scanners or aggressive browser pre-fetching often trigger the callback URL in the background.
        // This consumes the one-time Discord OAuth code. The subsequent *real* browser request gets "invalid_grant".
        // Solution: Cache the minted Firebase Custom Token in Firestore using the Discord code as the Document ID.
        const db = getFirestore();
        const codeDocRef = db.collection('_discord_oauth_cache').doc(codeString);

        let isReplay = false;
        // Poll for up to 6 seconds (15 chunks of 400ms)
        for (let i = 0; i < 15; i++) {
            try {
                const cachedDoc = await codeDocRef.get();
                if (cachedDoc.exists) {
                    isReplay = true;
                    if (cachedDoc.data().firebaseToken) {
                        logger.info("Anti-Replay Cache HIT! Returning cached token for code.");
                        const cachedToken = cachedDoc.data().firebaseToken;
                        let frontendUrl = 'http://localhost:5173/discord-auth';
                        if (req.hostname.includes('cloudfunctions.net') || req.hostname === 'kd-97-manager.web.app') {
                            frontendUrl = 'https://kd-97-manager.web.app/discord-auth';
                        }
                        return res.redirect(`${frontendUrl}#token=${cachedToken}`);
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
            // Processing timed out or failed on the other concurrent request
            return res.status(500).send("Login attempt timed out while waiting for secondary authentication response. Please try again.");
        }

        // Mark as processing to prevent immediate concurrent executions from trying to auth
        await codeDocRef.set({ status: 'processing', createdAt: FieldValue.serverTimestamp() });
        // -----------------------

        const clientId = DISCORD_CLIENT_ID.value().trim();
        const clientSecret = DISCORD_CLIENT_SECRET.value().trim();
        const redirectUri = DISCORD_REDIRECT_URI.value().trim();

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

        // 3. Sync User Profile in Firebase Auth
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

        // 4. Mint Firebase Custom Token
        const firebaseToken = await getAuth().createCustomToken(discordUid, {
            discordId: userData.id
        });

        // 5. Redirect back to frontend
        let frontendUrl = 'http://localhost:5173/discord-auth';
        if (req.hostname.includes('cloudfunctions.net') || req.hostname === 'kd-97-manager.web.app') {
            frontendUrl = 'https://kd-97-manager.web.app/discord-auth';
        }

        // Save token to anti-replay cache before redirecting
        await codeDocRef.update({ firebaseToken: firebaseToken });

        res.redirect(`${frontendUrl}#token=${firebaseToken}`);
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
