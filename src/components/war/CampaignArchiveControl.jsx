import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { useRole, ROLES } from '../../context/RoleContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Archive, AlertTriangle, CheckCircle2 } from '../ui/icons';
import { DATA_CONFIG } from '../../config/data-mapping';
import { invalidateKvkHistoryCache } from '../../hooks/useKvkHistory';
import { useRaceData } from '../../hooks/useRaceData';
import { buildRaceSummary } from '../../lib/raceSummary';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/**
 * F-015 / US-010 — King-only control that archives the current KvK performance
 * data (static_data/kvk + static_data/kvk_filler) into kvk_history/{id}.
 * Create-only: an already archived campaign can never be overwritten (rules enforce it too).
 */
const CampaignArchiveControl = () => {
    const { t } = useTranslation();
    const { isAuthorized } = useRole();
    const [title, setTitle] = useState(DATA_CONFIG.KVK.TITLE || '');
    const [order, setOrder] = useState('');
    const [startDate, setStartDate] = useState(DATA_CONFIG.KVK.START_DATE || '');
    const [endDate, setEndDate] = useState(DATA_CONFIG.KVK.END_DATE || '');
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'ok'|'err', text }
    const [counts, setCounts] = useState(null);
    // F-020 — résumé de course joint à l'archive (facultatif : une saison peut
    // n'avoir aucune campagne de course digérée).
    const { campaigns: raceCampaigns } = useRaceData();
    const [raceId, setRaceId] = useState('');

    const authorized = isAuthorized([ROLES.KING]);
    const docId = slugify(title);

    // Suggest the next season number from existing archives
    useEffect(() => {
        if (!authorized) return;
        getDocs(collection(db, 'kvk_history')).then(snap => {
            const maxOrder = snap.docs.reduce((m, d) => Math.max(m, d.data().order || 0), 0);
            setOrder(String(maxOrder + 1));
        }).catch(() => setOrder(''));
    }, [authorized]);

    if (!authorized) return null;

    const prepare = async () => {
        setMessage(null);
        setBusy(true);
        try {
            if (!docId) throw new Error(t('kvk_history.title_required'));
            const [existing, kvkSnap, fillerSnap] = await Promise.all([
                getDoc(doc(db, 'kvk_history', docId)),
                getDoc(doc(db, 'static_data', 'kvk')),
                getDoc(doc(db, 'static_data', 'kvk_filler'))
            ]);
            if (existing.exists()) throw new Error(t('kvk_history.already_archived'));
            const list = kvkSnap.exists() ? kvkSnap.data().list || [] : [];
            const fillerList = fillerSnap.exists() ? fillerSnap.data().list || [] : [];
            if (list.length === 0) throw new Error(t('kvk_history.no_current_data'));
            setCounts({ mains: list.length, fillers: fillerList.length });
            setConfirming(true);
        } catch (err) {
            setMessage({ type: 'err', text: err.message });
        }
        setBusy(false);
    };

    const archive = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const [kvkSnap, fillerSnap] = await Promise.all([
                getDoc(doc(db, 'static_data', 'kvk')),
                getDoc(doc(db, 'static_data', 'kvk_filler'))
            ]);
            const raceSummary = raceId
                ? buildRaceSummary(raceCampaigns.find((c) => c.id === raceId))
                : null;
            await setDoc(doc(db, 'kvk_history', docId), {
                title: title.trim(),
                order: Number(order) || null,
                startDate: startDate || null,
                endDate: endDate || null,
                list: kvkSnap.exists() ? kvkSnap.data().list || [] : [],
                fillerList: fillerSnap.exists() ? fillerSnap.data().list || [] : [],
                archivedAt: new Date().toISOString(),
                source: 'in-app closure (CampaignArchiveControl)',
                ...(raceSummary ? { race_summary: raceSummary } : {})
            });
            // BR-013 (étape 4 de l'étude E-004, décidée le 2026-07-20) : la campagne
            // active du War Tracker est marquée clôturée jusqu'à la saison suivante.
            try {
                await setDoc(doc(db, 'kvk_config', 'current'),
                    { status: 'closed', closedAt: new Date().toISOString() },
                    { merge: true });
            } catch (e) {
                console.warn('kvk_config close flag failed (archive itself succeeded):', e);
            }
            invalidateKvkHistoryCache();
            setConfirming(false);
            setMessage({ type: 'ok', text: t('kvk_history.archived_success', { title }) });
        } catch (err) {
            console.error('Archive failed:', err);
            setMessage({ type: 'err', text: err.message });
        }
        setBusy(false);
    };

    return (
        <Card className="p-4 md:p-6 border border-amber-500/20 bg-slate-900/40">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <Archive size={18} className="text-amber-400" />
                {t('kvk_history.archive_title')}
            </h3>
            <p className="text-sm text-slate-400 mb-4">{t('kvk_history.archive_desc')}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <Input
                    aria-label={t('kvk_history.campaign_title_label')}
                    label={t('kvk_history.campaign_title_label')}
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setConfirming(false); }}
                />
                <Input
                    aria-label={t('kvk_history.order_label')}
                    label={t('kvk_history.order_label')}
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                />
                <Input
                    aria-label={t('kvk_history.start_date')}
                    label={t('kvk_history.start_date')}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                    aria-label={t('kvk_history.end_date')}
                    label={t('kvk_history.end_date')}
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>

            {/* F-020 — joindre le résumé de course. Facultatif : une saison peut
                n'avoir aucune campagne digérée, et l'archive reste valable sans. */}
            {raceCampaigns.length > 0 && (
                <div className="mb-4">
                    <label htmlFor="archive-race-select" className="block text-xs text-slate-400 mb-1.5">
                        {t('kvk_history.race_summary_label')}
                    </label>
                    <select
                        id="archive-race-select"
                        value={raceId}
                        onChange={(e) => setRaceId(e.target.value)}
                        className="w-full bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[44px]"
                    >
                        <option value="">{t('kvk_history.race_summary_none')}</option>
                        {raceCampaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name || c.id} — {c.scanCount ?? 0} scans
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1.5">{t('kvk_history.race_summary_hint')}</p>
                </div>
            )}

            {!confirming ? (
                <Button onClick={prepare} disabled={busy || !title.trim()}>
                    <Archive size={16} />
                    {t('kvk_history.archive_button')}
                </Button>
            ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex flex-col gap-3">
                    <p className="text-sm text-amber-200 flex items-start gap-2">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        {t('kvk_history.confirm_prompt', { title, mains: counts?.mains, fillers: counts?.fillers, id: docId })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={archive} disabled={busy}>
                            {busy ? t('common.loading') : t('kvk_history.confirm_button')}
                        </Button>
                        <Button onClick={() => setConfirming(false)} disabled={busy} variant="secondary">
                            {t('kvk_history.cancel_button')}
                        </Button>
                    </div>
                </div>
            )}

            {message && (
                <p className={`mt-3 text-sm flex items-center gap-2 ${message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`} role="status">
                    {message.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {message.text}
                </p>
            )}
        </Card>
    );
};

export default CampaignArchiveControl;
