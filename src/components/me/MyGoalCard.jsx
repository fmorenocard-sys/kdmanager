import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target } from '../ui/icons';

/**
 * F-032 / Lot 2 — carte condensée « Mon objectif KvK » de l'espace perso
 * (spec §5.2). Consomme les lignes de `useMyKvkGoals()` (calcul partagé avec le
 * War Tracker, zéro duplication). Rend la forme du mock : barre de progression +
 * repères 60 % / 100 % + chiffres, SANS paliers 60/100/150 % (différés, décision
 * Roi §12.2 → cible unique 100 %).
 *
 * BR-019 : les CHIFFRES sont toujours visibles ; le LABEL de statut n'apparaît
 * que si `revealed` (kvk_config.revealGoalStatus, King-only).
 *
 * Multi-compte : compte principal par défaut + pills de sélection si l'utilisateur
 * a plusieurs comptes avec un objectif publié (même pattern qu'AvailabilityForm).
 */

const RATE_STYLES = {
    'Excellent': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'Good': 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
    'Need Improvement': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'Dead Weight': 'text-red-400 bg-red-500/10 border-red-500/30',
};
const rateKey = (rate) => `goals.rate_${rate.toLowerCase().replace(/\s+/g, '_')}`;

const MyGoalCard = ({ rows, primaryId, revealed, campaignName }) => {
    const { t, i18n } = useTranslation();
    const nf = (n, d = 1) => (n == null || !Number.isFinite(n))
        ? '—'
        : new Intl.NumberFormat(i18n.language, { maximumFractionDigits: d }).format(n);

    const published = (rows || []).filter((r) => r.published);
    const [selectedId, setSelectedId] = useState(null);
    if (!published.length) return null; // l'appelant montre NoGoalPublishedCard

    const defaultRow = published.find((r) => r.governorId === String(primaryId || '')) || published[0];
    const row = published.find((r) => r.governorId === selectedId) || defaultRow;

    // Repère à 60 % (seuil « Excellent » du barème) et cible à 100 % du goalKp.
    const pct = row.pct != null && Number.isFinite(row.pct) ? row.pct : null;
    const fillPct = pct == null ? 0 : Math.max(0, Math.min(pct, 1)) * 100;

    // BR-019 : statut masqué tant que le Roi ne l'a pas révélé (fin des combats).
    let statusBadge;
    if (!revealed) {
        statusBadge = (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title={t('goals.status_hidden_notice')}>
                {t('me.goal.hidden_short')}
            </span>
        );
    } else if (!row.rate) {
        statusBadge = <span className="text-slate-600 text-xs">—</span>;
    } else {
        statusBadge = (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${RATE_STYLES[row.rate]}`}>
                {t(rateKey(row.rate))}
            </span>
        );
    }

    return (
        <div className="v2-glass p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Target size={15} className="text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] truncate">
                        {t('me.nogoal.badge')}
                    </span>
                    {campaignName && (
                        <span className="font-mono text-[10px] text-[var(--text-secondary)] border border-white/10 rounded px-1.5 py-0.5 truncate">
                            {campaignName}
                        </span>
                    )}
                </div>
                <span className="font-mono text-lg font-bold text-white shrink-0">{pct == null ? '—' : `${nf(pct * 100, 0)} %`}</span>
            </div>

            {/* Sélecteur de compte (pills) si plusieurs comptes avec objectif publié */}
            {published.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                    {published.map((r) => {
                        const active = r.governorId === row.governorId;
                        return (
                            <button
                                key={r.governorId}
                                type="button"
                                onClick={() => setSelectedId(r.governorId)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${active ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-white/10 text-[var(--text-secondary)] hover:text-white'}`}
                            >
                                {r.name}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Barre de progression + repères 60 % / 100 % */}
            <div className="relative h-2.5 rounded-full bg-slate-700/60 overflow-visible">
                <div
                    className="absolute inset-y-0 start-0 rounded-full"
                    style={{ width: `${fillPct}%`, background: 'var(--grad-title)' }}
                />
                <div className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-white/45" style={{ insetInlineStart: '60%' }} />
                <div className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-emerald-400/80" style={{ insetInlineStart: '100%' }} />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-[var(--text-secondary)]">
                <span>0</span>
                <span>{t('me.goal.marker_min')}</span>
                <span>{t('me.goal.marker_target')}</span>
            </div>

            {/* Chiffres — war vs filler */}
            {row.type === 'filler' ? (
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 rounded-lg px-2.5 py-2">
                        <div className="text-[10px] text-[var(--text-secondary)]">{t('goals.declared_power')}</div>
                        <div className="font-mono text-[13px] text-[var(--text-primary)] font-bold">{nf(row.declaredPower, 0)}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg px-2.5 py-2">
                        <div className="text-[10px] text-[var(--text-secondary)]">{t('goals.dead_target')}</div>
                        <div className="font-mono text-[13px] text-white font-bold">{nf(row.target, 0)}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg px-2.5 py-2">
                        <div className="text-[10px] text-[var(--text-secondary)]">{t('goals.achieved')}</div>
                        <div className="font-mono text-[13px] text-red-400 font-bold">{nf(row.achieved, 0)}</div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-lg px-2.5 py-2">
                        <div className="text-[10px] text-[var(--text-secondary)]">{t('me.goal.kp')}</div>
                        <div className="font-mono text-[13px] text-[var(--text-primary)]">
                            <span className="font-bold">{nf(row.kpGained != null ? row.kpGained / 1e6 : null)}</span> / {nf(row.goalKp)} M
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-lg px-2.5 py-2">
                        <div className="text-[10px] text-[var(--text-secondary)]">{t('me.goal.dead')}</div>
                        <div className="font-mono text-[13px] text-red-400">≈ {nf(row.minDeadTroops / 1000, 0)} k T5</div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--text-secondary)]">{revealed ? '' : t('me.goal.reveal_note')}</span>
                {statusBadge}
            </div>
        </div>
    );
};

export default MyGoalCard;
