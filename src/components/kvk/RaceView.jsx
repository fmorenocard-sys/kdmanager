import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { useRole, ROLES } from '../../context/RoleContext';
import { useRaceData } from '../../hooks/useRaceData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import RacePlayersView from './RacePlayersView';
import RaceEfficiencyView from './RaceEfficiencyView';
import { Trophy, Users, History, TrendingUp, TrendingDown, Upload, CheckCircle2, AlertTriangle } from '../ui/icons';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// F-019 / US-017-018 — Vue « Course » (contenu, sans gate ni PageHeader) :
// utilisée par le Hub KvK (onglet Course) et par l'ancienne route /kvk-race.
// US-015 : panneau de dépôt de scan branché sur getRaceScanUploadUrl (BR-014).
const fmtCompact = (num) => {
    if (num == null) return '—';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
};

// Même convention de nommage que le pipeline (parse.js côté functions)
const SCAN_NAME_RE = /^\d+_(BASE_)?(?:SCAN_)?\d+_\d{2}_\d{2}_\d{4}\D+\d{2}_\d{2}_\d{2}_(AM|PM)/i;

const roleClass = (role) => role === 'nous'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : role === 'allie_concurrent_etoile'
        ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30'
        : 'text-red-400 bg-red-500/10 border-red-500/30';

const RaceView = () => {
    const { t } = useTranslation();
    const { isAuthorized } = useRole();
    const isLeadership = isAuthorized([ROLES.KING, ROLES.OFFICER]);
    const { campaigns, loading } = useRaceData();
    const [campaignId, setCampaignId] = useState(null);
    const [scanSeq, setScanSeq] = useState(null);
    const [rankView, setRankView] = useState('kingdoms'); // F-020 : classement royaumes ou joueurs
    const fileRef = useRef(null);
    const [uploadState, setUploadState] = useState(null); // {type:'ok'|'err', text}
    const [uploading, setUploading] = useState(false);

    const campaign = useMemo(
        () => campaigns.find((c) => c.id === campaignId) || campaigns[0] || null,
        [campaigns, campaignId]
    );
    const labels = useMemo(() => campaign?.labels || {}, [campaign]);
    const roles = campaign?.roles || {};
    const pinned = useMemo(() => (campaign?.pinned_kingdoms || []).map(Number), [campaign]);
    const [duelA, duelB] = (campaign?.hero_duel || [2, 3]).map(Number);

    const scans = useMemo(() => campaign?.scans || [], [campaign]);
    const scan = useMemo(
        () => scans.find((s) => s.seq === scanSeq) || scans[scans.length - 1] || null,
        [scans, scanSeq]
    );

    const camps = useMemo(
        () => [...(scan?.camps || [])].sort((a, b) => (b.dkp_net ?? 0) - (a.dkp_net ?? 0)),
        [scan]
    );

    const kingdoms = useMemo(() => {
        const list = [...(campaign?.kingdomsBySeq?.[scan?.seq] || [])]
            .sort((a, b) => (b.dkp_net ?? 0) - (a.dkp_net ?? 0))
            .map((k, i) => ({ ...k, rank: i + 1 }));
        return [...list.filter((k) => pinned.includes(Number(k.kingdom))),
            ...list.filter((k) => !pinned.includes(Number(k.kingdom)))];
    }, [campaign, scan, pinned]);

    // F-020 / US-019 — top joueurs du scan courant, déjà pré-agrégé par la Function.
    const players = useMemo(
        () => campaign?.playersBySeq?.[scan?.seq] || [],
        [campaign, scan]
    );

    const evolution = useMemo(() => scans.map((s) => ({
        seq: s.seq,
        [labels[duelA] || `Camp ${duelA}`]: s.duel?.camp_a ?? null,
        [labels[duelB] || `Camp ${duelB}`]: s.duel?.camp_b ?? null,
        ecart: s.duel?.ecart ?? null
    })), [scans, labels, duelA, duelB]);

    const uploadScan = async (file) => {
        if (!file) return;
        setUploadState(null);
        if (!file.name.toLowerCase().endsWith('.xlsx') || !SCAN_NAME_RE.test(file.name)) {
            setUploadState({ type: 'err', text: t('kvk_hub.upload_bad_name') });
            return;
        }
        setUploading(true);
        try {
            const getUrl = httpsCallable(functions, 'getRaceScanUploadUrl');
            const { data } = await getUrl({ campaignId: campaign.id, filename: file.name });
            const res = await fetch(data.url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
                body: file
            });
            if (!res.ok) throw new Error(`PUT ${res.status}`);
            setUploadState({ type: 'ok', text: t('kvk_hub.upload_ok') });
        } catch (err) {
            console.error('Scan upload failed:', err);
            setUploadState({ type: 'err', text: t('kvk_hub.upload_err') });
        }
        setUploading(false);
    };

    if (loading) return <div className="p-8 text-center text-muted">{t('common.loading')}</div>;

    if (!campaign || !scans.length) {
        return <div className="v2-glass p-8 text-center text-slate-400">{t('kvk_race.no_data')}</div>;
    }

    const duel = scan?.duel || null;
    const aheadIsA = duel && duel.ecart != null && duel.ecart >= 0;

    return (
        <div className="space-y-6">
            {/* Sélecteurs campagne + scan */}
            <div className="flex flex-wrap items-center gap-3">
                {campaigns.length > 1 && (
                    <select
                        aria-label={t('kvk_race.campaign_label')}
                        value={campaign.id}
                        onChange={(e) => { setCampaignId(e.target.value); setScanSeq(null); }}
                        className="bg-slate-900/80 border border-[var(--border-flat)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[44px]"
                    >
                        {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
                    </select>
                )}
                <label htmlFor="race-scan-select" className="text-sm text-slate-400 flex items-center gap-1.5">
                    <History size={14} />
                    {t('kvk_race.scan_label')}
                </label>
                <select
                    id="race-scan-select"
                    value={scan?.seq ?? ''}
                    onChange={(e) => setScanSeq(Number(e.target.value))}
                    className="bg-slate-900/80 border border-[var(--border-flat)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[44px]"
                >
                    {[...scans].reverse().map((s) => (
                        <option key={s.seq} value={s.seq}>
                            #{s.seq}{s.meta?.scanTs ? ` — ${String(s.meta.scanTs).slice(0, 10)}` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Duel hero */}
            {duel && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                    {[{ camp: duelA, val: duel.camp_a, isAhead: aheadIsA }, { camp: duelB, val: duel.camp_b, isAhead: !aheadIsA }].map(({ camp, val, isAhead }) => (
                        <section key={camp} className={`v2-glass ${isAhead ? 'v2-indigo' : ''} p-4 md:p-5 min-w-0`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleClass(roles[camp])}`}>
                                    {roles[camp] === 'nous' ? t('kvk_race.role_us') : roles[camp] === 'allie_concurrent_etoile' ? t('kvk_race.role_ally') : t('kvk_race.role_enemy')}
                                </span>
                                {isAhead && <Trophy size={14} weight="fill" className="text-amber-400" />}
                            </div>
                            <h3 className="text-lg font-bold text-white truncate">{labels[camp] || `Camp ${camp}`}</h3>
                            <p className="font-mono text-2xl font-bold text-white mt-1">{fmtCompact(val)}</p>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{t('kvk_race.dkp_col')}</p>
                        </section>
                    ))}
                    <section className="v2-glass p-4 md:p-5 min-w-0">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{t('kvk_race.gap')}</p>
                        <p className={`font-mono text-2xl font-bold ${aheadIsA ? 'text-emerald-400' : 'text-red-400'}`}>
                            {duel.ecart != null && duel.ecart >= 0 ? '+' : ''}{fmtCompact(duel.ecart)}
                        </p>
                        {duel.ecart_variation != null && (
                            <p className={`text-sm mt-2 flex items-center gap-1.5 ${duel.ecart_variation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {duel.ecart_variation >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {duel.ecart_variation >= 0 ? '+' : ''}{fmtCompact(duel.ecart_variation)}
                                <span className="text-xs text-slate-500">{t('kvk_race.gap_variation')}</span>
                            </p>
                        )}
                    </section>
                </div>
            )}

            {/* Camps + panneau de dépôt (US-015, maquette M1) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-stretch">
                {camps.map((c, i) => (
                    <section key={c.camp ?? i} className="v2-glass p-3 md:p-4 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-mono text-xs text-slate-500">#{i + 1}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleClass(roles[c.camp])}`}>
                                {labels[c.camp] || `Camp ${c.camp}`}
                            </span>
                        </div>
                        <p className="font-mono text-lg font-bold text-white">{fmtCompact(c.dkp_net)}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                            <Users size={11} />
                            {c.coverage} · {c.n_kingdoms} {t('kvk_race.kingdoms_title')}
                        </p>
                    </section>
                ))}
            </div>

            {isLeadership && (
                <section className="v2-glass p-4 md:p-5">
                    <h3 className="flex items-center gap-2.5 text-[15px] font-semibold text-white mb-1">
                        <Upload size={19} weight="duotone" className="text-amber-400" />
                        {t('kvk_hub.upload_title')}
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">{t('kvk_hub.upload_desc')}</p>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center justify-center gap-2 px-5 min-h-[44px] text-[13px] font-bold rounded-xl btn-grad-primary text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Upload size={16} />
                            {uploading ? t('common.loading') : t('kvk_hub.upload_button')}
                        </button>
                        <input
                            type="file"
                            ref={fileRef}
                            className="hidden"
                            accept=".xlsx"
                            onChange={(e) => { uploadScan(e.target.files[0]); e.target.value = ''; }}
                        />
                        {scan?.meta?.scanTs && (
                            <span className="text-xs text-slate-500">
                                {t('kvk_race.scan_label')} #{scan.seq} — {String(scan.meta.scanTs).slice(0, 16).replace('T', ' ')} UTC
                            </span>
                        )}
                        {uploadState && (
                            <p className={`text-sm flex items-center gap-2 ${uploadState.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`} role="status">
                                {uploadState.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                {uploadState.text}
                            </p>
                        )}
                    </div>
                </section>
            )}

            {/* Évolution du duel */}
            <section className="v2-glass v2-indigo p-4 md:p-5 min-w-0 overflow-hidden">
                <h3 className="flex items-center gap-2.5 text-[15px] font-semibold text-white mb-3">
                    <TrendingUp size={19} weight="duotone" className="text-[var(--indigo)]" />
                    {t('kvk_race.evolution_title')}
                </h3>
                <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={evolution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis dataKey="seq" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `#${v}`} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={fmtCompact} axisLine={false} tickLine={false} width={48} />
                            <Tooltip
                                formatter={(v) => fmtCompact(v)}
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                                labelFormatter={(v) => `${t('kvk_race.scan_label')} #${v}`}
                            />
                            <Line type="monotone" dataKey={labels[duelA] || `Camp ${duelA}`} stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey={labels[duelB] || `Camp ${duelB}`} stroke="#f87171" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="ecart" name={t('kvk_race.gap')} stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Classement — Royaumes (F-019) ou Joueurs (F-020 / US-019) */}
            <section className="v2-glass overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 pt-4 pb-3">
                    <div className="flex items-center gap-1.5">
                        {[
                            { id: 'kingdoms', label: t('kvk_race.kingdoms_title') },
                            { id: 'players', label: t('kvk_race.players_title') },
                            { id: 'efficiency', label: t('kvk_race.efficiency_title') }
                        ].map(({ id, label }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setRankView(id)}
                                aria-pressed={rankView === id}
                                className={`v2-tab ${rankView === id ? 'on' : 'off'} text-sm`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <span className="text-sm text-slate-400">
                        {rankView === 'players' ? players.length : kingdoms.length}
                    </span>
                </div>

                {rankView === 'efficiency' ? (
                    <RaceEfficiencyView
                        kingdoms={kingdoms}
                        players={players}
                        pinned={pinned}
                        labels={labels}
                        roles={roles}
                    />
                ) : rankView === 'players' ? (
                    <RacePlayersView
                        players={players}
                        pinned={pinned}
                        labels={labels}
                        roles={roles}
                        roleClass={roleClass}
                    />
                ) : (
                <>
                {/* Mobile cards */}
                <div className="md:hidden flex flex-col gap-3 p-4">
                    {kingdoms.map((k) => (
                        <div key={k.kingdom} className={`bg-[var(--surface-solid)] p-3 rounded-xl border ${pinned.includes(Number(k.kingdom)) ? 'border-amber-500/40' : 'border-[var(--border-flat)]'} flex flex-col gap-2`}>
                            <div className="flex justify-between items-center border-b border-[var(--border-flat)] pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="bg-slate-900 text-slate-400 text-xs font-bold px-2 py-1 rounded">#{k.rank}</span>
                                    <span className="font-bold text-white text-sm">KD {k.kingdom}</span>
                                    {pinned.includes(Number(k.kingdom)) && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/30">{t('kvk_race.pinned_badge')}</span>
                                    )}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] border ${roleClass(roles[k.camp])}`}>{labels[k.camp] || k.camp}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('kvk_race.dkp_col')}</span><span className="font-mono font-bold text-white">{fmtCompact(k.dkp_net)}</span></div>
                                <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('kvk_race.deads_col')}</span><span className="font-mono text-red-400">{fmtCompact(k.net_dead_diff)}</span></div>
                                <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('kvk_race.kp_col')}</span><span className="font-mono text-slate-300">{fmtCompact(k.net_kill_points_diff)}</span></div>
                                <div className="flex justify-between bg-[var(--border-flat)] p-1.5 rounded"><span className="text-slate-500">{t('kvk_race.coverage')}</span><span className="font-mono text-slate-300">{k.coverage}</span></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto mt-2">
                    <Table>
                        <TableHeader className="bg-slate-900/80 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-12 text-xs text-center">#</TableHead>
                                <TableHead className="text-xs">KD</TableHead>
                                <TableHead className="text-xs">{t('kvk_race.camps_title')}</TableHead>
                                <TableHead className="text-xs text-right">{t('kvk_race.dkp_col')}</TableHead>
                                <TableHead className="text-xs text-right">{t('kvk_race.kp_col')}</TableHead>
                                <TableHead className="text-xs text-right">{t('kvk_race.deads_col')}</TableHead>
                                <TableHead className="text-xs text-right">{t('kvk_race.t4_col')}</TableHead>
                                <TableHead className="text-xs text-right">{t('kvk_race.t5_col')}</TableHead>
                                <TableHead className="text-xs text-right">{t('kvk_race.coverage')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {kingdoms.map((k) => {
                                const isPinned = pinned.includes(Number(k.kingdom));
                                return (
                                    <TableRow key={k.kingdom} className={`hover:bg-white/5 border-b border-white/5 ${isPinned ? 'bg-amber-500/5' : ''}`}>
                                        <TableCell className="text-center text-xs font-mono text-slate-500">#{k.rank}</TableCell>
                                        <TableCell className="text-sm font-bold text-white whitespace-nowrap">
                                            KD {k.kingdom}
                                            {isPinned && <span className="ms-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/30">{t('kvk_race.pinned_badge')}</span>}
                                        </TableCell>
                                        <TableCell><span className={`px-2 py-0.5 rounded-full text-[10px] border ${roleClass(roles[k.camp])}`}>{labels[k.camp] || k.camp}</span></TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold text-white">{fmtCompact(k.dkp_net)}</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-300">{fmtCompact(k.net_kill_points_diff)}</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-red-400">{fmtCompact(k.net_dead_diff)}</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-300">{fmtCompact(k.net_kills_iv_diff)}</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-300">{fmtCompact(k.net_kills_v_diff)}</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-slate-500">{k.coverage}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                </>
                )}
            </section>
        </div>
    );
};

export default RaceView;
