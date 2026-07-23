import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { computeKvkGoals, DEAD_POINTS_PER_T5 } from '../../lib/kvkGoals';
import { rateFromGoalPct, RATES } from '../../lib/kvkScoring';
import Card from '../ui/Card';
import { Target, AlertTriangle, Skull, Swords, Trophy } from '../ui/icons';

// F-014 / US-009 — objectifs individuels du joueur connecté.
//
// On affiche le statut ABSOLU (seuils fixes sur le taux d'atteinte du KP Goal) et
// non la note relative de fin de campagne : un objectif qui bougerait selon les
// performances des autres serait inutilisable en cours de KvK.
//
// Domaine interne 2997 (BR-010) : rien à voir avec le DKP de course de la coalition.

const fmt = (n, digits = 1) => {
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(n);
};

const RATE_STYLES = {
    [RATES.EXCELLENT]: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    [RATES.GOOD]: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
    [RATES.NEED_IMPROVEMENT]: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    [RATES.DEADWEIGHT]: 'text-red-400 bg-red-500/10 border-red-500/30'
};

const GoalCard = ({ icon: Icon, tone, label, value, unit, hint }) => (
    <div className="bg-[var(--surface-solid)] border border-[var(--border-flat)] rounded-xl p-4 flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-400">
            {Icon && <Icon size={16} className={tone} />}
            <span className="truncate">{label}</span>
        </div>
        <div className="font-mono text-2xl font-bold text-white leading-tight">
            {value}
            {unit && <span className="text-sm font-normal text-slate-500 ms-1">{unit}</span>}
        </div>
        {hint && <p className="text-[11px] text-slate-500 leading-snug">{hint}</p>}
    </div>
);

const KvkGoalsPanel = () => {
    const { t } = useTranslation();
    const { governorId } = useAuth();
    const { players, kvkStats } = useData();

    const me = useMemo(() => {
        if (!governorId) return null;
        const id = String(governorId);
        return {
            profile: (players || []).find((p) => String(p.id) === id) || null,
            kvk: (kvkStats || []).find((p) => String(p.id) === id) || null
        };
    }, [governorId, players, kvkStats]);

    if (!governorId) {
        return (
            <Card className="p-6 text-center">
                <p className="text-sm text-slate-400">{t('goals.link_governor')}</p>
            </Card>
        );
    }

    if (!me?.profile && !me?.kvk) {
        return (
            <Card className="p-6 text-center">
                <p className="text-sm text-slate-400">{t('goals.not_found', { id: governorId })}</p>
            </Card>
        );
    }

    // La puissance de référence est celle du DÉBUT de campagne : c'est sur elle que
    // le barème est calé, et elle ne bouge plus une fois le KvK lancé — sinon
    // l'objectif d'un joueur baisserait à mesure qu'il perd des troupes.
    const power = me.kvk?.initialPower || me.profile?.power || 0;
    const goals = computeKvkGoals(power);

    const kpGained = me.kvk?.totalKpGained ?? null;
    const goalPct = (kpGained != null && goals.goalKp > 0)
        ? kpGained / (goals.goalKp * 1e6)
        : null;
    const { rate, uncertain } = rateFromGoalPct(goalPct);

    return (
        <div className="space-y-5">
            {/* En-tête : puissance de référence et statut */}
            <Card className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs text-slate-400">{t('goals.reference_power')}</p>
                    <p className="font-mono text-xl font-bold text-white">
                        {fmt(goals.powerM)} <span className="text-sm font-normal text-slate-500">M</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {me.kvk?.initialPower ? t('goals.power_from_campaign') : t('goals.power_from_profile')}
                    </p>
                </div>

                {rate && (
                    <div className="text-end">
                        <p className="text-xs text-slate-400 mb-1">{t('goals.status')}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${RATE_STYLES[rate]}`}>
                            {t(`goals.rate_${rate.toLowerCase().replace(/\s+/g, '_')}`)}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1 font-mono">
                            {t('goals.goal_attainment', { pct: fmt(goalPct * 100, 0) })}
                        </p>
                    </div>
                )}
            </Card>

            {/* Objectifs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <GoalCard
                    icon={Swords}
                    tone="text-slate-300"
                    label={t('goals.min_kp')}
                    value={fmt(goals.minKp)}
                    unit="M KP"
                    hint={t('goals.min_kp_hint')}
                />
                <GoalCard
                    icon={Trophy}
                    tone="text-amber-400"
                    label={t('goals.goal_kp')}
                    value={fmt(goals.goalKp)}
                    unit="M KP"
                    hint={t('goals.goal_kp_hint')}
                />
                <GoalCard
                    icon={Skull}
                    tone="text-red-400"
                    label={t('goals.min_dead')}
                    value={fmt(goals.minDead)}
                    unit={t('goals.dead_points_unit')}
                    hint={t('goals.min_dead_hint', {
                        troops: fmt(goals.minDeadApproxTroops / 1000, 0),
                        points: DEAD_POINTS_PER_T5
                    })}
                />
            </div>

            {/* Réserves de fiabilité — dites une fois, clairement */}
            {(goals.outOfDomain || goals.outsideValidatedRange || uncertain) && (
                <div className="flex items-start gap-2.5 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    <div className="flex flex-col gap-1">
                        {goals.outOfDomain && <p>{t('goals.warn_out_of_domain')}</p>}
                        {!goals.outOfDomain && goals.outsideValidatedRange && <p>{t('goals.warn_extrapolated')}</p>}
                        {uncertain && <p>{t('goals.warn_fuzzy_rate')}</p>}
                    </div>
                </div>
            )}

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Target size={12} />
                {t('goals.footnote')}
            </p>
        </div>
    );
};

export default KvkGoalsPanel;
