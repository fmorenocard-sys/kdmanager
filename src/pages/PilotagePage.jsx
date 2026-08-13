import React, { useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRole, ROLES } from '../context/RoleContext';
import { isModuleEnabled } from '../config/modules';
import WarDashboard from '../components/war/WarDashboard';
import KvkGoalsPanel from '../components/war/KvkGoalsPanel';
import DeadweightPage from './DeadweightPage';
import { LayoutDashboard, Target, Skull, ShieldAlert } from '../components/ui/icons';
import PageHeader from '../components/ui/PageHeader';
import AccessGate from '../components/ui/AccessGate';

// F-032 Lot 6 — hub « Pilotage » (spec Espace_Perso §7.2 / E-009 §3.1).
// Regroupe sous UNE entrée de nav leadership les surfaces de pilotage du royaume :
// War Dashboard (déclarations du royaume), Objectifs de campagne (Déclarants /
// Top du royaume) et Deadweight. Remplace le slot « Deadweight » et remet
// l'ex-War Tracker dans une nav propre (fin de l'interim §7.3). Leadership-only.
const PilotagePage = () => {
    const { currentUser } = useAuth();
    const { isAuthorized } = useRole();
    const { t } = useTranslation();
    const isLeadership = isAuthorized([ROLES.KING, ROLES.OFFICER]);
    const showDeadweight = isModuleEnabled('deadweight');

    const [searchParams, setSearchParams] = useSearchParams();
    const validTabs = ['dashboard', 'goals', ...(showDeadweight ? ['deadweight'] : [])];
    const [activeTab, setActiveTab] = useState(() => {
        const t0 = searchParams.get('tab');
        return validTabs.includes(t0) ? t0 : 'dashboard';
    });
    const goTab = (id) => {
        setActiveTab(id);
        const p = new URLSearchParams(searchParams);
        p.set('tab', id);
        setSearchParams(p, { replace: true });
    };

    // Visiteur → vitrine du royaume ; connecté non-leadership → Espace leadership.
    if (!currentUser) return <Navigate to="/royaume" replace />;
    if (!isLeadership) {
        return (
            <div className="space-y-6">
                <PageHeader icon={LayoutDashboard} title={t('nav.pilotage')} />
                <AccessGate
                    icon={ShieldAlert}
                    title={t('war.leadership_only_title')}
                    description={t('war.leadership_only_desc')}
                    hint={t('war.leadership_only_hint')}
                />
            </div>
        );
    }

    const tabs = [
        { id: 'dashboard', label: t('war.dashboard_title'), icon: LayoutDashboard },
        { id: 'goals', label: t('goals.tab_label'), icon: Target },
        ...(showDeadweight ? [{ id: 'deadweight', label: t('nav.deadweight'), icon: Skull }] : []),
    ];

    return (
        <div className="space-y-6">
            <PageHeader icon={LayoutDashboard} title={t('nav.pilotage')} subtitle={t('pilotage.subtitle')} />

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 pb-2" role="group" aria-label={t('nav.pilotage')}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => goTab(tab.id)}
                            aria-pressed={isActive}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border select-none ${
                                isActive
                                    ? 'ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/10 text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                                    : 'bg-[var(--border-flat)] text-slate-400 border-[var(--border-flat)] hover:border-slate-500 hover:bg-slate-700/50 hover:text-slate-200'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'dashboard' && (
                    <div className="animate-in fade-in duration-300"><WarDashboard /></div>
                )}
                {activeTab === 'goals' && (
                    <div className="animate-in fade-in duration-300"><KvkGoalsPanel /></div>
                )}
                {activeTab === 'deadweight' && showDeadweight && (
                    <div className="animate-in fade-in duration-300"><DeadweightPage embedded /></div>
                )}
            </div>
        </div>
    );
};

export default PilotagePage;
