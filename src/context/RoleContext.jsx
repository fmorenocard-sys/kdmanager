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
    const [role, setRole] = useState(ROLES.GUEST);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe = () => { };

        if (currentUser) {
            setLoading(true);
            const roleRef = doc(db, "roles", currentUser.uid);

            unsubscribe = onSnapshot(roleRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    console.log("[RoleContext] User Role Data:", data);

                    // Normalize: find the matching ROLE constant regardless of case
                    const fetchedRole = data.role;
                    const normalizedRole = Object.values(ROLES).find(r => r.toLowerCase() === (fetchedRole || "").toLowerCase()) || ROLES.WARRIOR;

                    setRole(normalizedRole);
                } else {
                    console.log("[RoleContext] No role document found for UID:", currentUser.uid);
                    setRole(ROLES.GUEST); // Or Warrior, depending on default policy. Sticking to Guest for safety.
                }
                setLoading(false);
            }, (error) => {
                console.error("[RoleContext] Error fetching role:", error);
                setRole(ROLES.GUEST);
                setLoading(false);
            });
        } else {
            setRole(ROLES.GUEST);
            setLoading(false);
        }

        return () => unsubscribe();
    }, [currentUser]);

    const isAuthorized = (requiredRoles) => {
        if (!Array.isArray(requiredRoles)) requiredRoles = [requiredRoles];
        // Hierarchy: King > Officer > Warrior > Guest
        // If required is Officer, King is also authorized.
        // Actually, let's keep it simple: exact match or explict list.
        // But commonly checking "at least Officer"

        const roleHierarchy = {
            [ROLES.KING]: 4,
            [ROLES.OFFICER]: 3,
            [ROLES.WARRIOR]: 2,
            [ROLES.GUEST]: 1
        };

        const currentLevel = roleHierarchy[role] || 0;

        // Check if any of the required roles is met by level or exact match
        // For simplicity in this app, let's say we pass the *minimum* role required.
        // But usually we pass "allowed roles".

        return requiredRoles.includes(role);
    };

    const isKing = role === ROLES.KING;
    const isOfficer = role === ROLES.OFFICER;
    const isAdmin = isKing; // King is Admin for now, or we can add specific Admin role.

    return (
        <RoleContext.Provider value={{ role, isKing, isOfficer, isAdmin, loading, isAuthorized }}>
            {!loading && children}
        </RoleContext.Provider>
    );
};
