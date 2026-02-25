import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider } from "../config/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, signInWithCustomToken } from "firebase/auth";

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [governorId, setGovernorId] = useState(null);

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

    const logout = () => {
        setGovernorId(null);
        return signOut(auth);
    };

    const linkGovernor = (id) => {
        if (currentUser) {
            localStorage.setItem(`gov_link_${currentUser.uid}`, id);
            setGovernorId(id);
        }
    };

    const unlinkGovernor = () => {
        if (currentUser) {
            localStorage.removeItem(`gov_link_${currentUser.uid}`);
            setGovernorId(null);
        }
    };

    useEffect(() => {
        // Intercepter le custom token retourné par notre webhook Discord
        const hash = window.location.hash;
        if (hash.includes('token=')) {
            const tokenParams = new URLSearchParams(hash.replace('#', '?'));
            const customToken = tokenParams.get('token');
            if (customToken) {
                setLoading(true);
                signInWithCustomToken(auth, customToken)
                    .then(() => {
                        window.history.replaceState(null, '', window.location.pathname + window.location.search);
                    })
                    .catch(err => {
                        console.error('Failed to sign in with custom token from Discord:', err);
                    });
            }
        }
    }, [auth]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                const storedGovId = localStorage.getItem(`gov_link_${user.uid}`);
                if (storedGovId) {
                    setGovernorId(storedGovId);
                }
            } else {
                setGovernorId(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        governorId,
        linkGovernor,
        unlinkGovernor,
        loginWithGoogle,
        loginWithDiscord,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
