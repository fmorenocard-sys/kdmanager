import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRole, ROLES } from '../context/RoleContext';
import AccessGate from '../components/ui/AccessGate';
import PageHeader from '../components/ui/PageHeader';
import RaceView from '../components/kvk/RaceView';
import { Flag, ShieldAlert } from '../components/ui/icons';

// Route de compatibilité /kvk-race (l'entrée de nav pointe désormais sur le
// Hub KvK, onglet Course). Réservée King/Officer (§9.4, modèle BR-011).
const KvKRacePage = () => {
    const { t } = useTranslation();
    const { isAuthorized, loading: roleLoading } = useRole();
    const isLeadership = isAuthorized([ROLES.KING, ROLES.OFFICER]);

    if (!roleLoading && !isLeadership) {
        return (
            <AccessGate
                icon={ShieldAlert}
                title={t('common.restricted')}
                description={t('common.restricted_desc')}
            />
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader icon={Flag} title={t('kvk_hub.tab_course')} subtitle={t('kvk_race.page_subtitle')} />
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30">
                    <Flag size={14} weight="fill" />
                    {t('kvk_hub.domain_race')}
                </span>
                <span className="text-xs text-slate-500">{t('kvk_hub.domain_race_note')}</span>
            </div>
            <RaceView />
        </div>
    );
};

export default KvKRacePage;
