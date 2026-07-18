import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { invalidateKvkHistoryCache } from '../../hooks/useKvkHistory';
import { Trophy, Activity, Skull, Users, Flag, Archive } from '../ui/icons';

// F-022 / US-023 — Timeline du Royaume (onglet « Progression du Royaume »,
// réservé King/Officer — BR-011). Le résultat officiel (outcome) est éditable
// par le Roi uniquement, sur les campagnes archivées (BR-012).
const OUTCOME_KEYS = {
    victory_star: 'kvk_history.outcome_victory_star',
    victory: 'kvk_history.outcome_victory',
    defeat: 'kvk_history.outcome_defeat'
};

const outcomeClass = (o) =>
    o === 'victory_star' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        : o === 'victory' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : 'text-red-400 bg-red-500/10 border-red-500/30';

// Agrégats royaume par campagne. Les champs absents des vieux formats
// (SoC 1/2) restent null et s'affichent « — » — jamais 0.
const aggregates = (c) => {
    const mains = Array.isArray(c.list) ? c.list : [];
    const fillers = Array.isArray(c.fillerList) ? c.fillerList : [];
    const sum = (arr, k) => arr.reduce((acc, p) => (typeof p[k] === 'number' ? (acc ?? 0) + p[k] : acc), null);
    const kp = sum(mains, 'totalKpGained');
    const deadMains = sum(mains, 'totalDead');
    const deadFillers = sum(fillers, 'totalDead');
    const dead = deadMains == null && deadFillers == null ? null : (deadMains ?? 0) + (deadFillers ?? 0);
    const goals = mains.map(p => p.goalPercent).filter(v => typeof v === 'number');
    const avgGoal = goals.length ? goals.reduce((a, b) => a + b, 0) / goals.length : null;
    return { kp, dead, accounts: mains.length + fillers.length, avgGoal };
};

const formatCompact = (num) => {
    if (num == null) return '—';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
};

const KingdomProgression = ({ campaigns, isKing }) => {
    const { t } = useTranslation();
    // Écrasements locaux post-sauvegarde (le cache kvk_history est invalidé
    // mais la liste en mémoire ne se rafraîchit qu'au prochain montage).
    const [outcomeOverrides, setOutcomeOverrides] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [saveError, setSaveError] = useState(null);

    const saveOutcome = async (docId, value) => {
        setSavingId(docId);
        setSaveError(null);
        try {
            await updateDoc(doc(db, 'kvk_history', docId), { outcome: value || null });
            setOutcomeOverrides(prev => ({ ...prev, [docId]: value || null }));
            invalidateKvkHistoryCache();
        } catch (err) {
            console.error('Error saving outcome:', err);
            setSaveError(docId);
        }
        setSavingId(null);
    };

    return (
        <div className="space-y-4">
            <ol className="relative border-s-2 border-[var(--border-flat)] ms-3 space-y-6">
                {campaigns.map((c) => {
                    const agg = aggregates(c);
                    const outcome = c.docId in outcomeOverrides ? outcomeOverrides[c.docId] : c.outcome;
                    return (
                        <li key={c.docId} className="ms-6 relative">
                            {/* Point de la frise */}
                            <span
                                className="absolute top-6 -start-[31px] w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center"
                                style={{
                                    background: c.isCurrent ? 'var(--grad-accent)' : 'var(--surface-solid)',
                                    borderColor: c.isCurrent ? 'transparent' : 'var(--border-flat)'
                                }}
                                aria-hidden="true"
                            />

                            <section className={`v2-glass ${c.isCurrent ? 'v2-indigo' : ''} p-4 md:p-5 min-w-0`}>
                                {/* En-tête campagne */}
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h3 className="text-base md:text-lg font-bold text-white">{c.title}</h3>
                                    {c.isCurrent && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'var(--grad-accent)' }}>
                                            {t('kvk_history.current_badge')}
                                        </span>
                                    )}
                                    {!c.isCurrent && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border text-slate-400 bg-slate-500/10 border-slate-500/20">
                                            <Archive size={10} />
                                            {t('kvk_history.archived_badge')}
                                        </span>
                                    )}
                                    {!c.isCurrent && outcome && (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${outcomeClass(outcome)}`}>
                                            {outcome === 'victory_star' && <Trophy size={12} weight="fill" />}
                                            {outcome === 'victory' && <Flag size={12} weight="fill" />}
                                            {t(OUTCOME_KEYS[outcome])}
                                        </span>
                                    )}
                                    {!c.isCurrent && !outcome && !isKing && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] border text-slate-500 bg-transparent border-[var(--border-flat)]">
                                            {t('kvk_history.outcome_unset')}
                                        </span>
                                    )}
                                </div>
                                {(c.startDate || c.endDate) && (
                                    <p className="text-xs text-slate-500 mb-4">{c.startDate || '…'} → {c.endDate || '…'}</p>
                                )}

                                {/* Agrégats royaume */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                                    <div className="flex items-center gap-2.5 min-h-[44px] px-3 py-2 rounded-[10px] bg-[var(--border-flat)]">
                                        <Activity size={18} weight="duotone" className="text-emerald-400 flex-none" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 truncate">{t('performance.total_kp_gained')}</p>
                                            <p className="font-mono font-bold text-sm text-emerald-400">{agg.kp != null ? `+${formatCompact(agg.kp)}` : '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 min-h-[44px] px-3 py-2 rounded-[10px] bg-[var(--border-flat)]">
                                        <Skull size={18} weight="duotone" className="text-red-400 flex-none" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 truncate">{t('performance.total_dead')}</p>
                                            <p className="font-mono font-bold text-sm text-red-400">{formatCompact(agg.dead)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 min-h-[44px] px-3 py-2 rounded-[10px] bg-[var(--border-flat)]">
                                        <Users size={18} weight="duotone" className="text-sky-400 flex-none" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 truncate">{t('kvk_history.accounts_count')}</p>
                                            <p className="font-mono font-bold text-sm text-white">{agg.accounts || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 min-h-[44px] px-3 py-2 rounded-[10px] bg-[var(--border-flat)]">
                                        <Trophy size={18} weight="duotone" className="text-amber-400 flex-none" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 truncate">{t('kvk_history.avg_goal')}</p>
                                            <p className="font-mono font-bold text-sm" style={{ color: agg.avgGoal == null ? 'var(--text-meta)' : agg.avgGoal >= 1 ? 'var(--success)' : agg.avgGoal >= 0.5 ? 'var(--rating-improve)' : 'var(--rating-dead)' }}>
                                                {agg.avgGoal != null ? `${(agg.avgGoal * 100).toFixed(1)}%` : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* BR-012 : saisie du résultat — Roi, campagnes archivées uniquement */}
                                {isKing && !c.isCurrent && (
                                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[var(--border-flat)]">
                                        <label htmlFor={`outcome-${c.docId}`} className="text-xs text-slate-400 font-semibold">
                                            {t('kvk_history.outcome_label')}
                                        </label>
                                        <select
                                            id={`outcome-${c.docId}`}
                                            value={outcome || ''}
                                            disabled={savingId === c.docId}
                                            onChange={(e) => saveOutcome(c.docId, e.target.value)}
                                            className="bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[44px] disabled:opacity-50"
                                        >
                                            <option value="">{t('kvk_history.outcome_unset')}</option>
                                            <option value="victory_star">{t('kvk_history.outcome_victory_star')}</option>
                                            <option value="victory">{t('kvk_history.outcome_victory')}</option>
                                            <option value="defeat">{t('kvk_history.outcome_defeat')}</option>
                                        </select>
                                        {savingId === c.docId && <span className="text-xs text-slate-500">{t('common.loading')}</span>}
                                        {saveError === c.docId && <span className="text-xs text-red-400">{t('common.error')}</span>}
                                    </div>
                                )}
                            </section>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};

export default KingdomProgression;
