import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { useRole, ROLES } from '../../context/RoleContext';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Flag, Save, RefreshCw, AlertTriangle, CheckCircle2, X } from '../ui/icons';

// F-018 / US-016 — Configuration de campagne KvK Race (King uniquement).
// Équivalent in-app du config/camp_labels.json du moteur Python : camps, duel,
// poids DKP de course (BR-010), exclusions anti-triche, base scan. La sauvegarde
// merge sur kvk_race/{id} (les champs de digestion restent aux Functions).
const CAMP_IDS = ['1', '2', '3', '4'];

const DEFAULT_FORM = {
    id: '',
    name: '',
    labels: { 1: '', 2: '', 3: '', 4: '' },
    roles: { 1: 'adversaire', 2: 'nous', 3: 'allie_concurrent_etoile', 4: 'adversaire' },
    hero_duel: [2, 3],
    our_camp: '2',
    pinnedText: '2997, 1523',
    base_scan_override: '',
    discord_channel_id: '',
    discord_snapshot_enabled: true,
    dkp: { kp_per_t4_kill: 10, kp_per_t5_kill: 20, mult_t4: 4, mult_t5: 10, weight_deads: 6 },
    exclusions: []
};

const slugOk = (s) => /^[a-z0-9_-]+$/i.test(s);

const RaceConfigForm = () => {
    const { t } = useTranslation();
    const { isAuthorized } = useRole();
    const authorized = isAuthorized([ROLES.KING]);

    const [campaigns, setCampaigns] = useState([]); // [{id, name, scanCount, latestSeq}]
    const [selectedId, setSelectedId] = useState('new');
    const [form, setForm] = useState(DEFAULT_FORM);
    const [digestState, setDigestState] = useState(null); // {scanCount, latestSeq}
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null); // {type: 'ok'|'err', text}

    useEffect(() => {
        if (!authorized) return;
        getDocs(collection(db, 'kvk_race')).then((snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setCampaigns(list);
            if (list.length) selectCampaign(list[0].id, list);
        }).catch((err) => console.error('kvk_race list error:', err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authorized]);

    const selectCampaign = (id, list = campaigns) => {
        setMessage(null);
        setSelectedId(id);
        if (id === 'new') {
            setForm(DEFAULT_FORM);
            setDigestState(null);
            return;
        }
        const c = list.find((x) => x.id === id);
        if (!c) return;
        setForm({
            id: c.id,
            name: c.name || '',
            labels: { ...DEFAULT_FORM.labels, ...(c.labels || {}) },
            roles: { ...DEFAULT_FORM.roles, ...(c.roles || {}) },
            hero_duel: Array.isArray(c.hero_duel) && c.hero_duel.length === 2 ? c.hero_duel.map(Number) : [2, 3],
            our_camp: String(c.our_camp || '2'),
            pinnedText: (c.pinned_kingdoms || []).join(', '),
            base_scan_override: c.base_scan_override == null ? '' : String(c.base_scan_override),
            discord_channel_id: c.discord_channel_id || '',
            discord_snapshot_enabled: c.discord_snapshot_enabled !== false,
            dkp: { ...DEFAULT_FORM.dkp, ...(c.dkp || {}) },
            exclusions: (c.exclusions || []).map((e) => ({
                active: e.active !== false,
                scope_type: e.scope_type === 'camp' ? 'camp' : 'kingdom',
                idsText: (e.ids || []).join(', '),
                from_seq: String(e.from_seq ?? ''),
                to_seq: String(e.to_seq ?? ''),
                reason: e.reason || ''
            }))
        });
        setDigestState(c.scanCount != null ? { scanCount: c.scanCount, latestSeq: c.latestSeq } : null);
    };

    const effective = useMemo(() => {
        const d = form.dkp;
        return {
            t4: (Number(d.kp_per_t4_kill) || 0) * (Number(d.mult_t4) || 0),
            t5: (Number(d.kp_per_t5_kill) || 0) * (Number(d.mult_t5) || 0),
            d: Number(d.weight_deads) || 0
        };
    }, [form.dkp]);

    if (!authorized) return null;

    const setDkp = (k, v) => setForm((f) => ({ ...f, dkp: { ...f.dkp, [k]: v } }));
    const setExcl = (i, k, v) => setForm((f) => ({
        ...f,
        exclusions: f.exclusions.map((e, idx) => (idx === i ? { ...e, [k]: v } : e))
    }));

    const save = async () => {
        setMessage(null);
        if (!slugOk(form.id)) {
            setMessage({ type: 'err', text: t('kvk_race.campaign_id_label') });
            return;
        }
        setBusy(true);
        try {
            const pinned = form.pinnedText.split(',').map((s) => Number(s.trim())).filter(Number.isFinite);
            const payload = {
                name: form.name.trim(),
                labels: form.labels,
                roles: form.roles,
                hero_duel: form.hero_duel.map(Number),
                our_camp: String(form.our_camp),
                pinned_kingdoms: pinned,
                base_scan_override: form.base_scan_override === '' ? null : Number(form.base_scan_override),
                discord_channel_id: form.discord_channel_id.trim(),
                discord_snapshot_enabled: !!form.discord_snapshot_enabled,
                dkp: Object.fromEntries(Object.entries(form.dkp).map(([k, v]) => [k, Number(v) || 0])),
                exclusions: form.exclusions.map((e) => ({
                    active: !!e.active,
                    scope_type: e.scope_type,
                    ids: e.idsText.split(',').map((s) => Number(s.trim())).filter(Number.isFinite),
                    from_seq: Number(e.from_seq) || 0,
                    to_seq: Number(e.to_seq) || 0,
                    reason: e.reason
                })),
                updatedAt: new Date().toISOString(),
                updatedBy: 'King'
            };
            await setDoc(doc(db, 'kvk_race', form.id), payload, { merge: true });
            setMessage({ type: 'ok', text: t('kvk_race.saved') });
            setCampaigns((prev) => {
                const rest = prev.filter((c) => c.id !== form.id);
                return [{ id: form.id, ...payload }, ...rest];
            });
            setSelectedId(form.id);
        } catch (err) {
            console.error('kvk_race save error:', err);
            setMessage({ type: 'err', text: t('kvk_race.save_error') });
        }
        setBusy(false);
    };

    const recompute = async () => {
        setMessage(null);
        setBusy(true);
        try {
            const fn = httpsCallable(functions, 'recomputeRaceCampaign');
            const res = await fn({ campaignId: form.id });
            setDigestState({ scanCount: res.data.scanCount, latestSeq: res.data.latestSeq });
            setMessage({ type: 'ok', text: t('kvk_race.recompute_done', { count: res.data.scanCount }) });
        } catch (err) {
            console.error('recompute error:', err);
            setMessage({ type: 'err', text: t('kvk_race.recompute_error') });
        }
        setBusy(false);
    };

    const inputCls = 'w-full bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[44px]';

    return (
        <Card className="p-4 md:p-6 border border-indigo-500/20 bg-slate-900/40">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <Flag size={18} className="text-indigo-400" />
                {t('kvk_race.config_title')}
            </h3>
            <p className="text-sm text-slate-400 mb-4">{t('kvk_race.config_desc')}</p>

            {/* Sélection de campagne */}
            <div className="flex flex-wrap items-end gap-3 mb-4">
                <div>
                    <label htmlFor="race-campaign-select" className="block text-xs text-slate-400 mb-1.5">{t('kvk_race.campaign_label')}</label>
                    <select
                        id="race-campaign-select"
                        value={selectedId}
                        onChange={(e) => selectCampaign(e.target.value)}
                        className={inputCls}
                    >
                        <option value="new">{t('kvk_race.new_campaign')}</option>
                        {campaigns.map((c) => (
                            <option key={c.id} value={c.id}>{c.name || c.id}</option>
                        ))}
                    </select>
                </div>
                {digestState && (
                    <span className="text-xs text-slate-500 pb-3">
                        {t('kvk_race.digest_state', { count: digestState.scanCount, seq: digestState.latestSeq ?? '—' })}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <Input
                    label={t('kvk_race.campaign_id_label')}
                    value={form.id}
                    disabled={selectedId !== 'new'}
                    onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                    placeholder="soc5_race_2026"
                />
                <Input
                    label={t('kvk_race.name_label')}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
            </div>

            {/* Camps */}
            <p className="text-sm font-semibold text-slate-300 mb-2">{t('kvk_race.camps_title')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {CAMP_IDS.map((cid) => (
                    <div key={cid} className="flex items-center gap-2 bg-[var(--border-flat)] rounded-lg p-2">
                        <span className="w-7 h-7 rounded-md bg-[var(--surface-solid)] text-slate-400 text-xs font-bold flex items-center justify-center flex-none">{cid}</span>
                        <input
                            aria-label={`${t('kvk_race.camp_label')} ${cid}`}
                            className={inputCls}
                            value={form.labels[cid] || ''}
                            onChange={(e) => setForm((f) => ({ ...f, labels: { ...f.labels, [cid]: e.target.value } }))}
                            placeholder={t('kvk_race.camp_label')}
                        />
                        <select
                            aria-label={`${t('kvk_race.camps_title')} ${cid}`}
                            className={inputCls}
                            value={form.roles[cid] || 'adversaire'}
                            onChange={(e) => setForm((f) => ({ ...f, roles: { ...f.roles, [cid]: e.target.value } }))}
                        >
                            <option value="nous">{t('kvk_race.role_us')}</option>
                            <option value="allie_concurrent_etoile">{t('kvk_race.role_ally')}</option>
                            <option value="adversaire">{t('kvk_race.role_enemy')}</option>
                        </select>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                    <label htmlFor="race-duel-a" className="block text-xs text-slate-400 mb-1.5">{t('kvk_race.hero_duel_label')} A</label>
                    <select id="race-duel-a" className={inputCls} value={form.hero_duel[0]}
                        onChange={(e) => setForm((f) => ({ ...f, hero_duel: [Number(e.target.value), f.hero_duel[1]] }))}>
                        {CAMP_IDS.map((c) => <option key={c} value={c}>{form.labels[c] || `Camp ${c}`}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="race-duel-b" className="block text-xs text-slate-400 mb-1.5">{t('kvk_race.hero_duel_label')} B</label>
                    <select id="race-duel-b" className={inputCls} value={form.hero_duel[1]}
                        onChange={(e) => setForm((f) => ({ ...f, hero_duel: [f.hero_duel[0], Number(e.target.value)] }))}>
                        {CAMP_IDS.map((c) => <option key={c} value={c}>{form.labels[c] || `Camp ${c}`}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="race-our-camp" className="block text-xs text-slate-400 mb-1.5">{t('kvk_race.our_camp_label')}</label>
                    <select id="race-our-camp" className={inputCls} value={form.our_camp}
                        onChange={(e) => setForm((f) => ({ ...f, our_camp: e.target.value }))}>
                        {CAMP_IDS.map((c) => <option key={c} value={c}>{form.labels[c] || `Camp ${c}`}</option>)}
                    </select>
                </div>
                <Input
                    label={t('kvk_race.base_override_label')}
                    type="number"
                    value={form.base_scan_override}
                    onChange={(e) => setForm((f) => ({ ...f, base_scan_override: e.target.value }))}
                />
            </div>

            <Input
                label={t('kvk_race.pinned_label')}
                value={form.pinnedText}
                onChange={(e) => setForm((f) => ({ ...f, pinnedText: e.target.value }))}
                placeholder="2997, 1523"
            />

            {/* US-021 — snapshot Discord après chaque ingestion */}
            <div className="mt-4 mb-4 bg-[var(--border-flat)] rounded-lg p-3">
                <p className="text-sm font-semibold text-indigo-400 mb-1">{t('kvk_race.snapshot_title')}</p>
                <p className="text-xs text-slate-500 mb-3">{t('kvk_race.snapshot_hint')}</p>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:items-end">
                    <Input
                        label={t('kvk_race.snapshot_channel_label')}
                        value={form.discord_channel_id}
                        onChange={(e) => setForm((f) => ({ ...f, discord_channel_id: e.target.value }))}
                        placeholder="123456789012345678"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-300 md:pb-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.discord_snapshot_enabled}
                            onChange={(e) => setForm((f) => ({ ...f, discord_snapshot_enabled: e.target.checked }))}
                            className="w-4 h-4 rounded border-[var(--border-flat)] bg-[var(--surface-input)] accent-indigo-500"
                        />
                        {t('kvk_race.snapshot_enabled_label')}
                    </label>
                </div>
            </div>

            {/* DKP de course */}
            <div className="mt-4 mb-4 bg-[var(--border-flat)] rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-400 mb-1">{t('kvk_race.dkp_title')}</p>
                <p className="text-xs text-slate-500 mb-3">{t('kvk_race.dkp_hint')}</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Input label={t('kvk_race.kp_t4')} type="number" value={form.dkp.kp_per_t4_kill} onChange={(e) => setDkp('kp_per_t4_kill', e.target.value)} />
                    <Input label={t('kvk_race.kp_t5')} type="number" value={form.dkp.kp_per_t5_kill} onChange={(e) => setDkp('kp_per_t5_kill', e.target.value)} />
                    <Input label={t('kvk_race.mult_t4')} type="number" value={form.dkp.mult_t4} onChange={(e) => setDkp('mult_t4', e.target.value)} />
                    <Input label={t('kvk_race.mult_t5')} type="number" value={form.dkp.mult_t5} onChange={(e) => setDkp('mult_t5', e.target.value)} />
                    <Input label={t('kvk_race.weight_deads')} type="number" value={form.dkp.weight_deads} onChange={(e) => setDkp('weight_deads', e.target.value)} />
                </div>
                <p className="text-xs font-mono text-slate-400 mt-2">
                    {t('kvk_race.effective_weights', effective)}
                </p>
            </div>

            {/* Exclusions */}
            <div className="mb-4">
                <p className="text-sm font-semibold text-red-400 mb-1">{t('kvk_race.exclusions_title')}</p>
                <p className="text-xs text-slate-500 mb-3">{t('kvk_race.excl_desc')}</p>
                <div className="flex flex-col gap-2">
                    {form.exclusions.map((e, i) => (
                        <div key={i} className="grid grid-cols-2 md:grid-cols-7 gap-2 items-center bg-[var(--border-flat)] rounded-lg p-2">
                            <label className="flex items-center gap-2 text-xs text-slate-400">
                                <input type="checkbox" checked={e.active} onChange={(ev) => setExcl(i, 'active', ev.target.checked)} className="w-4 h-4" />
                                {t('kvk_race.excl_active')}
                            </label>
                            <select aria-label={t('kvk_race.excl_scope_kingdom')} className={inputCls} value={e.scope_type} onChange={(ev) => setExcl(i, 'scope_type', ev.target.value)}>
                                <option value="kingdom">{t('kvk_race.excl_scope_kingdom')}</option>
                                <option value="camp">{t('kvk_race.excl_scope_camp')}</option>
                            </select>
                            <input aria-label={t('kvk_race.excl_ids')} className={inputCls} value={e.idsText} onChange={(ev) => setExcl(i, 'idsText', ev.target.value)} placeholder={t('kvk_race.excl_ids')} />
                            <input aria-label={t('kvk_race.excl_from')} className={inputCls} type="number" value={e.from_seq} onChange={(ev) => setExcl(i, 'from_seq', ev.target.value)} placeholder={t('kvk_race.excl_from')} />
                            <input aria-label={t('kvk_race.excl_to')} className={inputCls} type="number" value={e.to_seq} onChange={(ev) => setExcl(i, 'to_seq', ev.target.value)} placeholder={t('kvk_race.excl_to')} />
                            <input aria-label={t('kvk_race.excl_reason')} className={inputCls} value={e.reason} onChange={(ev) => setExcl(i, 'reason', ev.target.value)} placeholder={t('kvk_race.excl_reason')} />
                            <button
                                type="button"
                                onClick={() => setForm((f) => ({ ...f, exclusions: f.exclusions.filter((_, idx) => idx !== i) }))}
                                className="justify-self-end p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-red-400 rounded-lg"
                                aria-label={`${t('common.remove')} ${i + 1}`}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, exclusions: [...f.exclusions, { active: true, scope_type: 'kingdom', idsText: '', from_seq: '', to_seq: '', reason: '' }] }))}
                    className="mt-2 text-sm text-indigo-300 hover:text-indigo-200 min-h-[44px] px-2"
                >
                    + {t('kvk_race.excl_add')}
                </button>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 items-center">
                <Button onClick={save} disabled={busy || !form.id.trim()}>
                    <Save size={16} />
                    {busy ? t('common.loading') : t('kvk_race.save')}
                </Button>
                {selectedId !== 'new' && (
                    <Button onClick={recompute} disabled={busy} variant="secondary">
                        <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
                        {t('kvk_race.recompute')}
                    </Button>
                )}
                {message && (
                    <p className={`text-sm flex items-center gap-2 ${message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`} role="status">
                        {message.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        {message.text}
                    </p>
                )}
            </div>
        </Card>
    );
};

export default RaceConfigForm;
