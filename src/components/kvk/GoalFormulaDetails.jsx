import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    GOAL_CURVES, DOMAIN_MIN_MPOWER, VALIDATED_RANGE_MPOWER, DEAD_POINTS_PER_T5,
    computeKvkGoals
} from '../../lib/kvkGoals';
import { RATE_THRESHOLDS } from '../../lib/kvkScoring';
import { MathOperations } from '../ui/icons';

/**
 * F-038 / US-048 (Lot A) — affichage de la formule d'objectifs KvK réellement
 * appliquée (`Spec_Parametrage_Objectifs_KvK.md` §6).
 *
 * Lecture seule : tout vient des constantes exportées par `kvkGoals.js` /
 * `kvkScoring.js`, jamais d'une copie de la formule écrite ici — une formule
 * affichée qui divergerait du calcul serait pire que pas de formule.
 *
 * Deux audiences, un seul composant :
 *  - joueur (`/me`, `powerM` fourni) : le calcul de SON compte, chiffres d'abord ;
 *  - leadership (`/pilotage`, pas de `powerM`) : la formule + un exemple à une
 *    puissance ronde (`SAMPLE_MPOWER`).
 *
 * Domaine interne (BR-010) : ne jamais présenter ces chiffres à côté du DKP de
 * course — d'où le rappel `goals.footnote` conservé chez les appelants.
 */

// Puissance d'exemple pour la vue leadership : ronde, et dans la plage validée.
const SAMPLE_MPOWER = 60;

const nf = (lang, n, d = 3) => (n == null || !Number.isFinite(n))
    ? '—'
    : new Intl.NumberFormat(lang, { maximumFractionDigits: d }).format(n);

/** « 0,0556843 P² − 1,83037 P + 38,477 », signes gérés pour rester lisible. */
const polynomial = (lang, { a, b, c }) => {
    const term = (v, suffix) => `${v < 0 ? '−' : '+'} ${nf(lang, Math.abs(v), 7)}${suffix}`;
    return `${nf(lang, a, 7)} P² ${term(b, ' P')} ${term(c, '')}`;
};

const GoalFormulaDetails = ({ powerM = null, className = '' }) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;

    const isPlayer = Number.isFinite(powerM) && powerM > 0;
    const shownPowerM = isPlayer ? powerM : SAMPLE_MPOWER;
    const goals = computeKvkGoals(shownPowerM * 1e6);

    // Sous DOMAIN_MIN_MPOWER, le calcul est gelé au sommet de la courbe : on montre
    // alors la puissance réellement injectée, sinon le lecteur ne retrouve pas ses chiffres.
    const appliedDiffers = Math.abs(goals.appliedPowerM - shownPowerM) > 0.001;

    const rows = [
        { key: 'min_kp', label: t('goals.min_kp'), formula: polynomial(lang, GOAL_CURVES.minKp), value: `${nf(lang, goals.minKp, 1)} M` },
        { key: 'goal_kp', label: t('goals.goal_kp'), formula: polynomial(lang, GOAL_CURVES.goalKp), value: `${nf(lang, goals.goalKp, 1)} M` },
        {
            key: 'min_dead',
            label: t('goals.min_dead'),
            formula: `${nf(lang, GOAL_CURVES.minDead.outerMult, 3)} × (${polynomial(lang, GOAL_CURVES.minDead)})`,
            value: `${nf(lang, goals.minDead, 1)} ${t('goals.dead_points_unit')}`
        }
    ];

    const thresholds = [
        { rate: 'rate_need_improvement', from: RATE_THRESHOLDS.needImprovement, to: RATE_THRESHOLDS.good },
        { rate: 'rate_good', from: RATE_THRESHOLDS.good, to: RATE_THRESHOLDS.excellent },
        { rate: 'rate_excellent', from: RATE_THRESHOLDS.excellent, to: null }
    ];
    const pct = (v) => `${nf(lang, v * 100, 0)} %`;

    return (
        <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-3 lg:p-4 space-y-3 ${className}`}>
            <div className="flex items-center gap-2">
                <MathOperations size={14} className="text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    {t('goals.formula_title')}
                </span>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)]">
                {isPlayer
                    ? t('goals.formula_at_your_power', { power: nf(lang, shownPowerM, 1) })
                    : t('goals.formula_at_sample_power', { power: nf(lang, shownPowerM, 0) })}
                {appliedDiffers && ` ${t('goals.formula_applied_power', { power: nf(lang, goals.appliedPowerM, 2) })}`}
            </p>

            {/* Une ligne par courbe : résultat chiffré d'abord, formule littérale ensuite. */}
            <ul className="space-y-2">
                {rows.map((r) => (
                    <li key={r.key} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="text-xs text-[var(--text-secondary)]">{r.label}</span>
                        <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{r.value}</span>
                        <span className="w-full font-mono text-[10px] text-[var(--text-secondary)] break-words">{r.formula}</span>
                    </li>
                ))}
            </ul>

            <p className="text-[10px] text-[var(--text-secondary)]">{t('goals.formula_variable_note')}</p>

            <div className="pt-2 border-t border-white/10 space-y-1.5">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    {t('goals.formula_thresholds_title')}
                </span>
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    <li className="font-mono text-[11px] text-[var(--text-secondary)]">
                        {t('goals.rate_dead_weight')} : &lt; {pct(RATE_THRESHOLDS.needImprovement)}
                    </li>
                    {thresholds.map((th) => (
                        <li key={th.rate} className="font-mono text-[11px] text-[var(--text-secondary)]">
                            {t(`goals.${th.rate}`)} : {pct(th.from)}{th.to == null ? ' +' : ` – ${pct(th.to)}`}
                        </li>
                    ))}
                </ul>
                <p className="text-[10px] text-[var(--text-secondary)]">
                    {t('goals.formula_thresholds_note')}
                </p>
            </div>

            <p className="text-[10px] text-[var(--text-secondary)]">
                {t('goals.formula_validated_note', {
                    min: nf(lang, VALIDATED_RANGE_MPOWER.min, 1),
                    max: nf(lang, VALIDATED_RANGE_MPOWER.max, 1),
                    floor: nf(lang, DOMAIN_MIN_MPOWER, 2)
                })}
                {' '}
                {t('goals.dead_points_note', { points: DEAD_POINTS_PER_T5 })}
            </p>
        </div>
    );
};

export default GoalFormulaDetails;
