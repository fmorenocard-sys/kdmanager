import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
    CartesianGrid, Tooltip, ReferenceLine, Cell
} from 'recharts';

// F-020 — vue « Efficacité » : puissance investie contre DKP de course produit.
//
// La question à laquelle elle répond n'est pas « qui a le plus de DKP » (le
// classement le dit déjà) mais « qui rend plus que sa puissance ne le laissait
// attendre ». D'où la ligne de référence : la moyenne de la ligue, tracée en
// diagonale. Au-dessus = surperformance, en-dessous = sous-performance, quel que
// soit le gabarit du royaume ou du joueur.

const fmtCompact = (num) => {
    if (num == null) return '—';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
};

const CAMP_COLORS = {
    nous: '#f59e0b',
    allie_concurrent_etoile: '#6366f1',
    adversaire: '#64748b'
};

// Défini hors du composant : une fonction recréée à chaque rendu remonterait un
// nouveau type de composant à Recharts, qui redémonterait l'infobulle en continu.
const TooltipContent = ({ active, payload }) => {
    const { t } = useTranslation();
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
        <div className="bg-slate-900 border border-white/10 rounded-lg p-3 text-xs shadow-xl">
            <p className="font-bold text-white">{p.label}</p>
            <p className="text-slate-500 mb-1">{p.sub}</p>
            <p className="text-slate-300 font-mono">{t('kvk_race.power_col')} : {fmtCompact(p.power)}</p>
            <p className="text-slate-300 font-mono">{t('kvk_race.dkp_col')} : {fmtCompact(p.dkp)}</p>
            <p className="text-indigo-300 font-mono">
                {t('kvk_race.eff_col')} : {fmtCompact(p.dkp / (p.power / 1e6))}
            </p>
        </div>
    );
};

const RaceEfficiencyView = ({ kingdoms = [], players = [], pinned = [], labels = {}, roles = {} }) => {
    const { t } = useTranslation();
    const [scope, setScope] = useState('kingdoms');

    const points = useMemo(() => {
        if (scope === 'players') {
            return players
                .filter((p) => p.latest_power > 0 && p.dkp_net != null)
                .map((p) => ({
                    id: p.governor_id,
                    label: p.name || `#${p.governor_id}`,
                    sub: `KD ${p.kingdom}`,
                    power: p.latest_power,
                    dkp: p.dkp_net,
                    camp: p.camp,
                    emphasis: pinned.includes(Number(p.kingdom))
                }));
        }
        return kingdoms
            .filter((k) => k.total_power > 0 && k.dkp_net != null)
            .map((k) => ({
                id: k.kingdom,
                label: `KD ${k.kingdom}`,
                sub: labels[k.camp] || `Camp ${k.camp}`,
                power: k.total_power,
                dkp: k.dkp_net,
                camp: k.camp,
                emphasis: pinned.includes(Number(k.kingdom))
            }));
    }, [scope, kingdoms, players, pinned, labels]);

    // Moyenne de la ligue : DKP total / puissance totale. C'est bien un rapport de
    // sommes et non une moyenne des rapports — sinon un petit royaume très efficace
    // tirerait la référence autant qu'un gros, et la ligne perdrait son sens.
    const avgPerPower = useMemo(() => {
        const totalDkp = points.reduce((acc, p) => acc + p.dkp, 0);
        const totalPower = points.reduce((acc, p) => acc + p.power, 0);
        return totalPower > 0 ? totalDkp / totalPower : 0;
    }, [points]);

    const maxPower = useMemo(
        () => points.reduce((acc, p) => Math.max(acc, p.power), 0),
        [points]
    );

    const ranked = useMemo(() => [...points]
        .map((p) => ({ ...p, ratio: p.power > 0 ? (p.dkp / p.power) / (avgPerPower || 1) : 0 }))
        .sort((a, b) => b.ratio - a.ratio), [points, avgPerPower]);

    if (!points.length) {
        return (
            <div className="px-4 md:px-6 py-10 text-center text-sm text-slate-400">
                {t('kvk_race.efficiency_empty')}
            </div>
        );
    }

    return (
        <div className="px-4 md:px-6 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                    {[
                        { id: 'kingdoms', label: t('kvk_race.kingdoms_title') },
                        { id: 'players', label: t('kvk_race.players_title') }
                    ].map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setScope(id)}
                            aria-pressed={scope === id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${scope === id
                                ? 'text-white bg-indigo-500/20 border-indigo-500/50'
                                : 'text-slate-400 bg-[var(--surface-input)] border-[var(--border-flat)] hover:text-white'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-500">{t('kvk_race.efficiency_hint')}</p>
            </div>

            <div className="h-[320px] md:h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 16, bottom: 24, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                        <XAxis
                            type="number"
                            dataKey="power"
                            name={t('kvk_race.power_col')}
                            tickFormatter={fmtCompact}
                            tick={{ fill: '#7d8ca5', fontSize: 11 }}
                            stroke="rgba(255,255,255,.15)"
                        />
                        <YAxis
                            type="number"
                            dataKey="dkp"
                            name={t('kvk_race.dkp_col')}
                            tickFormatter={fmtCompact}
                            tick={{ fill: '#7d8ca5', fontSize: 11 }}
                            stroke="rgba(255,255,255,.15)"
                            width={52}
                        />
                        <Tooltip content={<TooltipContent />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,.2)' }} />
                        {/* Diagonale de la moyenne : y = moyenne × x */}
                        <ReferenceLine
                            segment={[{ x: 0, y: 0 }, { x: maxPower, y: maxPower * avgPerPower }]}
                            stroke="#a855f7"
                            strokeDasharray="5 4"
                            ifOverflow="extendDomain"
                        />
                        <Scatter data={points} isAnimationActive={false}>
                            {points.map((p) => (
                                <Cell
                                    key={p.id}
                                    fill={CAMP_COLORS[roles[p.camp]] || CAMP_COLORS.adversaire}
                                    fillOpacity={p.emphasis ? 1 : 0.55}
                                    stroke={p.emphasis ? '#fbbf24' : 'none'}
                                    strokeWidth={p.emphasis ? 2 : 0}
                                />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            {/* Sur / sous-performance, en multiples de la moyenne de la ligue */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {[
                    { key: 'over', title: t('kvk_race.efficiency_over'), rows: ranked.slice(0, 5) },
                    { key: 'under', title: t('kvk_race.efficiency_under'), rows: ranked.slice(-5).reverse() }
                ].map(({ key, title, rows }) => (
                    <div key={key} className="bg-[var(--border-flat)] rounded-lg p-3">
                        <p className="text-xs font-semibold text-slate-300 mb-2">{title}</p>
                        <ul className="flex flex-col gap-1">
                            {rows.map((p) => (
                                <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="truncate text-slate-300">
                                        {p.label} <span className="text-slate-600">{p.sub}</span>
                                    </span>
                                    <span className={`font-mono font-bold shrink-0 ${p.ratio >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        ×{p.ratio.toFixed(2)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RaceEfficiencyView;
