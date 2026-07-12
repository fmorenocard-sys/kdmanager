
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRole, ROLES } from '../context/RoleContext';
import KvKConfigForm from '../components/war/KvKConfigForm';
import AvailabilityForm from '../components/war/AvailabilityForm';
import WarDashboard from '../components/war/WarDashboard';
import { Shield, Swords, LayoutDashboard } from '../components/ui/icons';

const WarTrackerPage = () => {
    const { role, isAuthorized } = useRole();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('declaration'); // declaration, dashboard, config

    const showDashboard = isAuthorized([ROLES.KING, ROLES.OFFICER]);
    const showConfig = isAuthorized([ROLES.KING]);

    const tabs = [
        { id: 'declaration', label: t('war.declaration_form'), icon: Swords },
        ...(showDashboard ? [{ id: 'dashboard', label: t('war.dashboard_title'), icon: LayoutDashboard }] : []),
        ...(showConfig ? [{ id: 'config', label: 'KvK Config', icon: Shield }] : [])
    ];

    return (
        <div className="space-y-6">
            <header className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('war.tracker_title')} ⚔️</h1>
                <p className="text-slate-400">{t('war.tracker_subtitle')}</p>
            </header>

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

                {activeTab === 'dashboard' && showDashboard && (
                    <div className="animate-in fade-in duration-300">
                        <WarDashboard />
                    </div>
                )}

                {activeTab === 'config' && showConfig && (
                    <div className="animate-in fade-in duration-300">
                        <KvKConfigForm />
                    </div>
                )}
            </div>
        </div>
    );
};

export default WarTrackerPage;
