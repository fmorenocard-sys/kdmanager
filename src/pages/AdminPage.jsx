import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRole, ROLES } from '../context/RoleContext';
import AccessGate from '../components/ui/AccessGate';
import PageHeader from '../components/ui/PageHeader';
import DataRefreshControl from '../components/DataRefreshControl';
import KvKConfigForm from '../components/war/KvKConfigForm';
import CampaignArchiveControl from '../components/war/CampaignArchiveControl';
import RaceConfigForm from '../components/kvk/RaceConfigForm';
import MaintenanceTools from '../components/admin/MaintenanceTools';
import { ShieldAlert, Database, Flag, Hammer, Shield } from '../components/ui/icons';

// Refonte navigation (maquette M3) — page Administration, Roi uniquement,
// accessible via la zone « Administration » de la sidebar (pas de bottom nav).
// Rail interne sticky = navigation par ancre entre les 4 sections.
const AdminPage = () => {
    const { t } = useTranslation();
    const { isAuthorized, loading: roleLoading } = useRole();
    const isKing = isAuthorized([ROLES.KING]);

    if (!roleLoading && !isKing) {
        return (
            <AccessGate
                icon={ShieldAlert}
                title={t('common.restricted')}
                description={t('common.restricted_desc')}
            />
        );
    }

    const rail = [
        { id: 'data', label: t('admin.rail_data'), icon: Database },
        { id: 'campaign', label: t('admin.rail_campaign'), icon: Shield },
        { id: 'race', label: t('admin.rail_race'), icon: Flag },
        { id: 'maintenance', label: t('admin.rail_maintenance'), icon: Hammer }
    ];

    const scrollTo = (id) => document.getElementById(`admin-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader icon={Hammer} title={t('nav.admin')} subtitle={t('admin.subtitle')} />

            <div className="grid grid-cols-1 lg:grid-cols-[216px_1fr] gap-5 items-start">
                {/* Rail interne (sticky en desktop, horizontal en mobile) */}
                <nav className="v2-glass p-2 flex lg:flex-col flex-row gap-1 overflow-x-auto hide-scrollbar lg:sticky lg:top-6" aria-label={t('nav.admin')}>
                    {rail.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => scrollTo(id)}
                            className="v2-nav-item px-3 text-[13px] font-semibold whitespace-nowrap shrink-0"
                        >
                            {Icon && <Icon size={18} />}
                            {label}
                        </button>
                    ))}
                </nav>

                {/* Sections */}
                <div className="flex flex-col gap-8 min-w-0">
                    <section id="admin-data" className="scroll-mt-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                            <Database size={20} weight="duotone" className="text-indigo-400" />
                            {t('admin.rail_data')}
                        </h2>
                        <DataRefreshControl />
                    </section>

                    <section id="admin-campaign" className="scroll-mt-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                            <Shield size={20} weight="duotone" className="text-amber-400" />
                            {t('admin.rail_campaign')}
                        </h2>
                        <div className="space-y-6">
                            <KvKConfigForm />
                            {/* F-015: clôture de campagne (archive kvk_history) */}
                            <CampaignArchiveControl />
                        </div>
                    </section>

                    <section id="admin-race" className="scroll-mt-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                            <Flag size={20} weight="duotone" className="text-cyan-400" />
                            {t('admin.rail_race')}
                        </h2>
                        <RaceConfigForm />
                    </section>

                    <section id="admin-maintenance" className="scroll-mt-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
                            <Hammer size={20} weight="duotone" className="text-orange-400" />
                            {t('admin.rail_maintenance')}
                        </h2>
                        <MaintenanceTools />
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
