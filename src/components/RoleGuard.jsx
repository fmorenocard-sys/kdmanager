
import React from 'react';
import { useRole } from '../context/RoleContext';

const RoleGuard = ({ requiredRoles, children, fallback = null }) => {
    const { role, loading } = useRole();

    if (loading) return null;

    const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    if (!rolesToCheck.includes(role)) {
        return fallback;
    }

    return <>{children}</>;
};

export default RoleGuard;
