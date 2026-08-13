import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../config/firebase";
import { doc, onSnapshot } from "firebase/firestore";

const RoleContext = createContext();

export const ROLES = {
    KING: 'King',
    OFFICER: 'Officer',
    WARRIOR: 'Warrior',
    GUEST: 'Guest'
};

export const useRole = () => {
    return useContext(RoleContext);
};

export const RoleProvider = ({ children }) => {
    const { currentUser } = useAuth();
    // Rôle RÉEL (depuis Firestore roles/{uid}) — la source de vérité.
    const [realRole, setRealRole] = useState(ROLES.GUEST);
    // F-033 « Voir en tant que » : rôle SIMULÉ (Roi-only, PRÉSENTATION UNIQUEMENT).
    // Override client-side du rôle effectif pour prévisualiser le gating UI d'un
    // autre rôle. Ne change RIEN aux règles Firestore (elles évaluent toujours le
    // vrai uid) — ce n'est donc jamais un test des restrictions de DONNÉES (BR-021).
    // En mémoire seulement : réinitialisé au rechargement (on évite qu'un Roi oublie
    // qu'il visualise en Warrior).
    const [impersonatedRoleState, setImpersonatedRoleState] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe = () => { };

        if (currentUser) {
            setLoading(true);
            const roleRef = doc(db, "roles", currentUser.uid);

            unsubscribe = onSnapshot(roleRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const fetchedRole = data.role;
                    const normalizedRole = Object.values(ROLES).find(r => r.toLowerCase() === (fetchedRole || "").toLowerCase()) || ROLES.WARRIOR;
                    setRealRole(normalizedRole);
                } else {
                    setRealRole(ROLES.GUEST);
                }
                setLoading(false);
            }, (error) => {
                console.error("[RoleContext] Error fetching role:", error);
                setRealRole(ROLES.GUEST);
                setLoading(false);
            });
        } else {
            setRealRole(ROLES.GUEST);
            setLoading(false);
        }

        return () => unsubscribe();
    }, [currentUser]);

    // Seul un VRAI Roi peut activer l'aperçu.
    const canImpersonate = realRole === ROLES.KING;

    // Garde-fou sans effet : l'aperçu n'a d'effet que pour un vrai Roi. Si le rôle
    // réel n'est plus Roi, `impersonatedRole` retombe à null de lui-même.
    const impersonatedRole = canImpersonate ? impersonatedRoleState : null;

    // Setter gardé : null (ou choisir son propre rôle) = revenir à sa vue.
    const setImpersonatedRole = (r) => {
        if (!canImpersonate) return;
        setImpersonatedRoleState(r && Object.values(ROLES).includes(r) && r !== realRole ? r : null);
    };

    // Rôle EFFECTIF : le simulé s'il est actif, sinon le réel. Tout le gating UI
    // (nav, AccessGate, isKing/isOfficer/isAuthorized) s'appuie dessus.
    const role = impersonatedRole || realRole;

    const isAuthorized = (requiredRoles) => {
        if (!Array.isArray(requiredRoles)) requiredRoles = [requiredRoles];
        return requiredRoles.includes(role);
    };

    const isKing = role === ROLES.KING;
    const isOfficer = role === ROLES.OFFICER;
    const isAdmin = isKing;

    return (
        <RoleContext.Provider value={{
            role, realRole, isKing, isOfficer, isAdmin, loading, isAuthorized,
            // F-033 « Voir en tant que »
            impersonatedRole, isImpersonating: !!impersonatedRole, canImpersonate, setImpersonatedRole,
        }}>
            {!loading && children}
        </RoleContext.Provider>
    );
};
