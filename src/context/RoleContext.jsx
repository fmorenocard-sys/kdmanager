import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../config/firebase";
import { doc, onSnapshot } from "firebase/firestore";

const RoleContext = createContext();

export const ROLES = {
    // Admin (opérateur) au-dessus du Roi : super-admin qui hérite de TOUS les pouvoirs
    // du Roi + opère l'instance. Se distingue du Roi par son attribution (env
    // ROLE_ADMIN_USER_IDS, cf. functions/discordAuth.js) et sa vocation « opérer sans
    // être le Roi in-game » (A-033 / BR-020). Décision Roi 2026-08-13.
    ADMIN: 'Admin',
    KING: 'King',
    OFFICER: 'Officer',
    WARRIOR: 'Warrior',
    GUEST: 'Guest'
};

// Hiérarchie par niveau — un gate est satisfait par le niveau requis OU plus haut.
const ROLE_LEVEL = {
    [ROLES.ADMIN]: 5,
    [ROLES.KING]: 4,
    [ROLES.OFFICER]: 3,
    [ROLES.WARRIOR]: 2,
    [ROLES.GUEST]: 1,
};
const levelOf = (r) => ROLE_LEVEL[r] || 0;

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

    // Le Roi OU l'Admin (niveau Roi+) peut activer l'aperçu de rôle (F-033, outil ops/QA).
    const canImpersonate = levelOf(realRole) >= ROLE_LEVEL[ROLES.KING];

    // Garde-fou sans effet : l'aperçu n'a d'effet qu'au niveau Roi+. Si le rôle réel
    // retombe plus bas, `impersonatedRole` redevient null de lui-même.
    const impersonatedRole = canImpersonate ? impersonatedRoleState : null;

    // Setter gardé : null (ou choisir son propre rôle) = revenir à sa vue.
    const setImpersonatedRole = (r) => {
        if (!canImpersonate) return;
        setImpersonatedRoleState(r && Object.values(ROLES).includes(r) && r !== realRole ? r : null);
    };

    // Rôle EFFECTIF : le simulé s'il est actif, sinon le réel. Tout le gating UI
    // (nav, AccessGate, isKing/isOfficer/isAuthorized) s'appuie dessus.
    const role = impersonatedRole || realRole;

    // Gating HIÉRARCHIQUE : le rôle satisfait le gate s'il est au moins au niveau le
    // plus BAS de la liste requise (les appels n'utilisent que [KING] et [KING, OFFICER]
    // = « ce niveau ou au-dessus »). L'Admin (niveau 5) satisfait donc tous les gates Roi.
    const isAuthorized = (requiredRoles) => {
        if (!Array.isArray(requiredRoles)) requiredRoles = [requiredRoles];
        if (!requiredRoles.length) return false;
        const minReq = Math.min(...requiredRoles.map(levelOf));
        return levelOf(role) >= minReq;
    };

    const isKing = levelOf(role) >= ROLE_LEVEL[ROLES.KING]; // Roi OU Admin (niveau Roi+)
    const isOfficer = role === ROLES.OFFICER;               // exact (affichage/badges)
    const isAdmin = isKing;                                  // pouvoirs admin = Roi ou Admin

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
