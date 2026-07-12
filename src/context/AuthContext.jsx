import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider, db } from "../config/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, signInWithCustomToken } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [governorId, setGovernorId] = useState(null);
    // Discord-verified identity: logged in through Discord SSO (uid "discord:…")
    // or a Google account whose profile carries a linked discordId (BR-008)
    const [isDiscordUser, setIsDiscordUser] = useState(false);

    const loginWithGoogle = async () => {
        try {
            return await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const loginWithDiscord = () => {
        // Redirige vers notre Firebase Hosting Rewrite qui pointe sur la Cloud Function
        window.location.href = '/api/discordLogin';
    };

    const linkWithDiscord = () => {
        // Lance le flux OAuth en mode "link"
        window.location.href = '/api/discordLogin?action=link';
    };

    const logout = () => {
        setGovernorId(null);
        return signOut(auth);
    };

    const linkGovernor = async (id) => {
        if (currentUser) {
            localStorage.setItem(`gov_link_${currentUser.uid}`, id);
            setGovernorId(id);
            // Persist to Firestore so the Discord bot can resolve the governor
            try {
                await setDoc(
                    doc(db, "user_profiles", currentUser.uid),
                    { governorId: String(id) },
                    { merge: true }
                );
            } catch (err) {
                console.warn("Could not persist governorId to Firestore:", err);
            }
        }
    };

    const unlinkGovernor = () => {
        if (currentUser) {
            localStorage.removeItem(`gov_link_${currentUser.uid}`);
            setGovernorId(null);
        }
    };

    useEffect(() => {
        // Intercepter le custom token ou le linkToken retourné par notre webhook Discord
        // Avec HashRouter, l'URL peut ressembler à /#/profile?linkToken=... ou #token=...
        const urlStr = window.location.href;
        if (urlStr.includes('token=') || urlStr.includes('linkToken=')) {
            // Extraction robuste des paramètres depuis l'URL complète
            let queryString = '';
            if (urlStr.includes('?')) {
                queryString = urlStr.substring(urlStr.indexOf('?'));
            } else if (urlStr.includes('#token=')) {
                queryString = urlStr.substring(urlStr.indexOf('#')).replace('#', '?');
            }

            const tokenParams = new URLSearchParams(queryString);
            const customToken = tokenParams.get('token');
            const linkToken = tokenParams.get('linkToken');

            if (customToken) {
                setLoading(true);
                signInWithCustomToken(auth, customToken)
                    .then(() => {
                        window.history.replaceState(null, '', window.location.pathname + window.location.search);
                    })
                    .catch(err => {
                        console.error('Failed to sign in with custom token from Discord:', err);
                        setLoading(false);
                    });
            } else if (linkToken) {
                // Appel la Cloud Function pour confirmer le linking avec le jeton sécurisé
                import('firebase/functions').then(({ httpsCallable }) => {
                    import('../config/firebase').then(({ functions }) => {
                        const confirmDiscordLinkCall = httpsCallable(functions, 'confirmDiscordLink');
                        confirmDiscordLinkCall({ linkToken })
                            .then(() => {
                                console.log("Discord lié avec succès !");
                                window.history.replaceState(null, '', window.location.href.split('?')[0]); // preserve the hash route but clear query params
                                // Refresh page or auth state to reflect new identity
                                window.location.reload();
                            })
                            .catch(err => {
                                console.error('Erreur lors du linking Discord:', err);
                                alert("Erreur lors de la liaison du compte Discord: " + err.message);
                            });
                    });
                });
            }
        }
    }, [auth]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Read the profile ONCE, before any write: a concurrent merge-write
                // makes reads return the optimistic local view (the pending fields
                // only), which broke the Discord check in production builds.
                const storedGovId = localStorage.getItem(`gov_link_${user.uid}`);
                let profile = {};
                try {
                    const snap = await getDoc(doc(db, "user_profiles", user.uid));
                    if (snap.exists()) profile = snap.data();
                } catch (err) {
                    console.warn("Could not fetch user profile from Firestore:", err);
                }

                setIsDiscordUser(
                    user.uid.startsWith('discord:') || !!(profile.discordId || profile.discordUid)
                );

                if (storedGovId) {
                    setGovernorId(storedGovId);
                    // Sync to Firestore only when it actually diverges
                    if (String(profile.governorId || '') !== String(storedGovId)) {
                        setDoc(doc(db, "user_profiles", user.uid), { governorId: String(storedGovId) }, { merge: true })
                            .catch(err => console.warn("Could not auto-sync governorId to Firestore:", err));
                    }
                } else if (profile.governorId) {
                    setGovernorId(profile.governorId);
                    localStorage.setItem(`gov_link_${user.uid}`, profile.governorId);
                }
            } else {
                setGovernorId(null);
                setIsDiscordUser(false);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        governorId,
        isDiscordUser,
        linkGovernor,
        unlinkGovernor,
        loginWithGoogle,
        loginWithDiscord,
        linkWithDiscord,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
