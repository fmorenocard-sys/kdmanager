
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRole, ROLES } from '../context/RoleContext';
import AvailabilityForm from '../components/war/AvailabilityForm';
import WarDashboard from '../components/war/WarDashboard';
import KvkGoalsPanel from '../components/war/KvkGoalsPanel';
import { Shield, Swords, LayoutDashboard, Target } from '../components/ui/icons';

import PageHeader from '../components/ui/PageHeader';

// Refonte navigation : le War Tracker est recentré sur la préparation
// (déclaration + War Dashboard). La config KvK vit désormais dans /admin (M3).
const WarTrackerPage = () => {
    const { isAuthorized } = useRole();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('declaration'); // declaration, dashboard

    const showDashboard = isAuthorized([ROLES.KING, ROLES.OFFICER]);

    const tabs = [
        { id: 'declaration', label: t('war.declaration_form'), icon: Swords },
        // F-014 / US-009 : les objectifs vivent ici, au moment où le joueur déclare
        // ses troupes — c'est là qu'il se demande ce qu'on attend de lui.
        { id: 'goals', label: t('goals.tab_label'), icon: Target },
        ...(showDashboard ? [{ id: 'dashboard', label: t('war.dashboard_title'), icon: LayoutDashboard }] : [])
    ];

    return (
        <div className="space-y-6">
            <PageHeader icon={Shield} title={t('war.tracker_title')} subtitle={t('war.tracker_subtitle')} />

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 pb-2" role="group" aria-label="War Tracker Views">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
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
                {activeTab === 'declaration' && (
                    <div className="animate-in fade-in duration-300">
                        <AvailabilityForm />
                    </div>
                )}

                {activeTab === 'goals' && (
                    <div className="animate-in fade-in duration-300">
                        <KvkGoalsPanel />
                    </div>
                )}

                {activeTab === 'dashboard' && showDashboard && (
                    <div className="animate-in fade-in duration-300">
                        <WarDashboard />
                    </div>
                )}
            </div>
        </div>
    );
};

export default WarTrackerPage;
