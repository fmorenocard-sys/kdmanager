
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRole, ROLES } from '../context/RoleContext';
import KvKConfigForm from '../components/war/KvKConfigForm';
import AvailabilityForm from '../components/war/AvailabilityForm';
import WarDashboard from '../components/war/WarDashboard';
import { Shield, Swords, LayoutDashboard } from 'lucide-react';

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
            <div className="flex border-b border-slate-700 mb-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            snap-start flex-shrink-0 flex items-center gap-2 px-4 md:px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap
                            ${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}
                        `}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
                        )}
                    </button>
                ))}
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
                    <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
                        <KvKConfigForm />
                    </div>
                )}
            </div>
        </div>
    );
};

export default WarTrackerPage;
