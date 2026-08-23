import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    GOAL_CURVES, DOMAIN_MIN_MPOWER, VALIDATED_RANGE_MPOWER, DEAD_POINTS_PER_T5,
    computeKvkGoals
} from '../../lib/kvkGoals';
import { RATE_THRESHOLDS } from '../../lib/kvkScoring';
import { Info, ChevronDown, ChevronUp } from '../ui/icons';

/**
 * F-038 / US-048 (Lot A) — d'où sort l'objectif KvK affiché
 * (`Spec_Parametrage_Objectifs_KvK.md` §6).
 *
 * Lecture seule : tout vient des constantes exportées par `kvkGoals.js` /
 * `kvkScoring.js`, jamais d'une copie de la formule écrite ici — une formule
 * affichée qui divergerait du calcul serait pire que pas de formule.
 *
 * **Révision 2026-08-23 (retour du Roi sur la V1)** : la V1 posait les trois
 * polynômes en tête de `/pilotage`, dépliés — « ça prend de la place et on
 * comprend rien ». Deux principes en réponse :
 *   1. coût zéro quand on ne demande rien : tout est replié derrière un lien ;
 *   2. les CHIFFRES d'abord, la phrase en français ensuite, les polynômes en
 *      dernier — derrière un second niveau, pour qui veut vérifier le calcul.
 *
 * Deux audiences, un seul composant :
 *  - joueur (`/me`, `powerM` fourni) : le calcul de SON compte ;
 *  - leadership (`/pilotage`, sans `powerM`) : un exemple à `SAMPLE_MPOWER`.
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

// `defaultOpen`/`defaultShowMath` : uniquement pour rendre les deux niveaux
// dépliés dans le smoke test de rendu (ces écrans sont derrière l'auth, BUG-008).
const GoalFormulaDetails = ({ powerM = null, className = '', defaultOpen = false, defaultShowMath = false }) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const [open, setOpen] = useState(defaultOpen);
    const [showMath, setShowMath] = useState(defaultShowMath);

    const isPlayer = Number.isFinite(powerM) && powerM > 0;
    const shownPowerM = isPlayer ? powerM : SAMPLE_MPOWER;
    const goals = computeKvkGoals(shownPowerM * 1e6);

    // Sous DOMAIN_MIN_MPOWER, le calcul est gelé au sommet de la courbe : on montre
    // alors la puissance réellement injectée, sinon le lecteur ne retrouve pas ses chiffres.
    const appliedDiffers = Math.abs(goals.appliedPowerM - shownPowerM) > 0.001;

    const rows = [
        { key: 'min_kp', label: t('goals.min_kp'), formula: polynomial(lang, GOAL_CURVES.minKp), value: nf(lang, goals.minKp, 1), unit: 'M' },
        { key: 'goal_kp', label: t('goals.goal_kp'), formula: polynomial(lang, GOAL_CURVES.goalKp), value: nf(lang, goals.goalKp, 1), unit: 'M' },
        {
            key: 'min_dead',
            label: t('goals.min_dead'),
            formula: `${nf(lang, GOAL_CURVES.minDead.outerMult, 3)} × (${polynomial(lang, GOAL_CURVES.minDead)})`,
            value: nf(lang, goals.minDead, 1),
            unit: t('goals.dead_points_unit')
        }
    ];

    const pct = (v) => `${nf(lang, v * 100, 0)} %`;
    const bands = [
        { rate: 'rate_dead_weight', label: `< ${pct(RATE_THRESHOLDS.needImprovement)}` },
        { rate: 'rate_need_improvement', label: `${pct(RATE_THRESHOLDS.needImprovement)} – ${pct(RATE_THRESHOLDS.good)}` },
        { rate: 'rate_good', label: `${pct(RATE_THRESHOLDS.good)} – ${pct(RATE_THRESHOLDS.excellent)}` },
        { rate: 'rate_excellent', label: `${pct(RATE_THRESHOLDS.excellent)} +` }
    ];

    return (
        <div className={className}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 min-h-[44px] text-[11px] text-[var(--text-secondary)] hover:text-white transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            >
                <Info size={13} aria-hidden="true" />
                {t('goals.formula_cta')}
                {open ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
            </button>

            {open && (
                <div className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 lg:p-4 space-y-3">
                    <p className="text-xs text-[var(--text-secondary)]">
                        {t('goals.formula_intro')}
                    </p>

                    {/* Les chiffres d'abord : c'est ce que le lecteur cherche. */}
                    <div>
                        <p className="text-[11px] text-[var(--text-secondary)] mb-1.5">
                            {isPlayer
                                ? t('goals.formula_at_your_power', { power: nf(lang, shownPowerM, 1) })
                                : t('goals.formula_at_sample_power', { power: nf(lang, shownPowerM, 0) })}
                            {appliedDiffers && ` ${t('goals.formula_applied_power', { power: nf(lang, goals.appliedPowerM, 2) })}`}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {rows.map((r) => (
                                <div key={r.key} className="bg-white/5 rounded-lg px-2.5 py-2">
                                    <div className="text-[11px] text-[var(--text-secondary)] truncate">{r.label}</div>
                                    <div className="font-mono text-[15px] text-[var(--text-primary)]">
                                        <span className="font-bold">{r.value}</span> {r.unit}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Seuils : une bande de puces, pas un paragraphe. */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] text-[var(--text-secondary)]">{t('goals.formula_thresholds_note')}</p>
                        <ul className="flex flex-wrap gap-1.5">
                            {bands.map((b) => (
                                <li key={b.rate} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                                    {t(`goals.${b.rate}`)} <span className="font-mono">{b.label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Second niveau : les polynômes, pour qui veut refaire le calcul. */}
                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={() => setShowMath((v) => !v)}
                            aria-expanded={showMath}
                            className="inline-flex items-center gap-1.5 min-h-[44px] text-[11px] text-[var(--text-secondary)] hover:text-white transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
                        >
                            {t('goals.formula_math_toggle')}
                            {showMath ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
                        </button>
                        {showMath && (
                            <div className="mt-1.5 space-y-2 border-t border-white/10 pt-2">
                                <ul className="space-y-1">
                                    {rows.map((r) => (
                                        <li key={r.key} className="font-mono text-[10px] text-[var(--text-secondary)] break-words">
                                            <span className="text-[var(--text-primary)]">{r.label}</span> = {r.formula}
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-[10px] text-[var(--text-secondary)]">
                                    {t('goals.formula_variable_note')}{' '}
                                    {t('goals.formula_validated_note', {
                                        min: nf(lang, VALIDATED_RANGE_MPOWER.min, 1),
                                        max: nf(lang, VALIDATED_RANGE_MPOWER.max, 1),
                                        floor: nf(lang, DOMAIN_MIN_MPOWER, 2)
                                    })}{' '}
                                    {t('goals.dead_points_note', { points: DEAD_POINTS_PER_T5 })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoalFormulaDetails;
