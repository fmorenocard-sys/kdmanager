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

    // governorId = l'ID du compte PRIMAIRE (miroir rétrocompat lu par tout le
    // reste de l'app : AvailabilityForm, KvkGoalsPanel, bot Discord, etc.).
    const [governorId, setGovernorId] = useState(null);
    // E-007/F-025 : liste des comptes réclamés, chacun { governorId, type, name }.
    // type ∈ {'war','filler'} ; le compte primaire est celui dont governorId === le
    // champ governorId ci-dessus (pas de flag isPrimary séparé — BR-016).
    const [accounts, setAccounts] = useState([]);
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
        setAccounts([]);
        return signOut(auth);
    };

    // Normalise un compte : governorId en string, type borné à war|filler.
    const normalizeAccount = (a) => ({
        governorId: String(a.governorId),
        type: a.type === 'filler' ? 'filler' : 'war',
        name: a.name || null,
    });

    // Applique un nouvel état (primaire + liste) : state, localStorage (miroir du
    // primaire) et Firestore (merge). Une seule voie d'écriture pour tout muter.
    const applyProfile = async (nextGovernorId, nextAccounts) => {
        if (!currentUser) return;
        const gov = nextGovernorId ? String(nextGovernorId) : null;
        const list = (nextAccounts || []).map(normalizeAccount);
        setGovernorId(gov);
        setAccounts(list);
        if (gov) localStorage.setItem(`gov_link_${currentUser.uid}`, gov);
        else localStorage.removeItem(`gov_link_${currentUser.uid}`);
        try {
            await setDoc(
                doc(db, "user_profiles", currentUser.uid),
                { governorId: gov, accounts: list, updatedAt: new Date().toISOString() },
                { merge: true }
            );
        } catch (err) {
            console.warn("Could not persist user_profiles:", err);
        }
    };

    // Réclame un compte (F-025). Le 1er compte réclamé devient primaire.
    const claimAccount = (id, type = 'war', name = null) => {
        const gid = String(id);
        if (accounts.some((a) => a.governorId === gid)) return; // déjà réclamé
        const next = [...accounts, normalizeAccount({ governorId: gid, type, name })];
        const primary = governorId || gid; // 1er compte → primaire
        return applyProfile(primary, next);
    };

    // Retire un compte. S'il était primaire, le primaire est réassigné au 1er restant.
    const unclaimAccount = (id) => {
        const gid = String(id);
        const next = accounts.filter((a) => a.governorId !== gid);
        const primary = governorId === gid ? (next[0]?.governorId || null) : governorId;
        return applyProfile(primary, next);
    };

    // Change le type d'un compte (war ↔ filler).
    const setAccountType = (id, type) => {
        const gid = String(id);
        const next = accounts.map((a) => a.governorId === gid ? { ...a, type: type === 'filler' ? 'filler' : 'war' } : a);
        return applyProfile(governorId, next);
    };

    // Désigne le compte primaire (doit être déjà réclamé).
    const setPrimaryAccount = (id) => {
        const gid = String(id);
        if (!accounts.some((a) => a.governorId === gid)) return;
        return applyProfile(gid, accounts);
    };

    // Rétrocompat : lie/écrase le gouverneur unique (appelé par AvailabilityForm sur
    // saisie manuelle). Le réclame comme compte de guerre s'il est absent, puis le
    // désigne primaire — préserve la sémantique « ceci est désormais mon gouverneur ».
    const linkGovernor = (id) => {
        const gid = String(id);
        const next = accounts.some((a) => a.governorId === gid)
            ? accounts
            : [...accounts, normalizeAccount({ governorId: gid, type: 'war' })];
        return applyProfile(gid, next);
    };

    // Rétrocompat : délie tout (ancienne sémantique « unlink »).
    const unlinkGovernor = () => applyProfile(null, []);

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

                // E-007/F-025 : charge la liste des comptes. Migration paresseuse
                // (option A, A-024) : si le doc n'a pas encore accounts[] mais un
                // governorId legacy, on synthétise un compte de guerre primaire en
                // mémoire — réécrit dans Firestore seulement à la prochaine mutation.
                if (Array.isArray(profile.accounts) && profile.accounts.length) {
                    setAccounts(profile.accounts.map((a) => ({
                        governorId: String(a.governorId),
                        type: a.type === 'filler' ? 'filler' : 'war',
                        name: a.name || null,
                    })));
                } else {
                    const primaryId = storedGovId || profile.governorId;
                    setAccounts(primaryId ? [{ governorId: String(primaryId), type: 'war', name: null }] : []);
                }
            } else {
                setGovernorId(null);
                setAccounts([]);
                setIsDiscordUser(false);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        governorId,
        accounts,
        isDiscordUser,
        linkGovernor,
        unlinkGovernor,
        claimAccount,
        unclaimAccount,
        setAccountType,
        setPrimaryAccount,
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
