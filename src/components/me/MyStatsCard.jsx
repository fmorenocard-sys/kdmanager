import { useTranslation } from 'react-i18next';
import { Activity } from '../ui/icons';
import { meType } from './meType';

/**
 * F-032 / Lot 4 — carte « Mes stats » de l'espace perso (spec §5.3). Parité
 * /mystats en web, version MINIMALE et SANS Kingdom rank (décision Roi §12.4) :
 * puissance, KP gagné, morts — sur les stats de CAMPAGNE (mêmes données que
 * l'objectif). Rendue seulement quand le scan correspond à la campagne courante
 * (statsCurrent) — l'appelant s'en assure, on ne réaffiche pas de chiffres périmés.
 * Retirable sans laisser de trou de mise en page (le mock le dit).
 */
const MyStatsCard = ({ stats }) => {
    const { t, i18n } = useTranslation();
    if (!stats) return null;
    const nf = (n, d = 1) => (n == null || !Number.isFinite(n))
        ? '—'
        : new Intl.NumberFormat(i18n.language, { maximumFractionDigits: d }).format(n);

    const cells = [
        { label: t('me.stats.power'), value: `${nf(stats.powerM)} M`, tone: 'text-[var(--text-primary)]' },
        { label: t('me.stats.kp_gained'), value: `${nf(stats.kpGainedM)} M`, tone: 'text-emerald-400' },
        { label: t('me.stats.deaths'), value: nf(stats.deaths, 0), tone: 'text-red-400' },
    ];

    return (
        <div className="v2-glass p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Activity size={15} className="text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                    <span className={`${meType.label} text-[var(--text-secondary)]`}>{t('me.stats.title')}</span>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0">{t('me.stats.note')}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {cells.map((c) => (
                    <div key={c.label} className="min-w-0">
                        <div className={meType.cellLabel}>{c.label}</div>
                        <div className={`font-mono text-[17px] font-bold ${c.tone} truncate`}>{c.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyStatsCard;
