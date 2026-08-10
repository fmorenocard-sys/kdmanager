import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRole, ROLES } from '../../context/RoleContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Calendar, Save, Plus, Trash2 } from '../ui/icons';

// F-031 / US-035 (E-008) — Éditeur King du calendrier KvK (décision D2 : formulaire
// ligne-à-ligne, pré-remplissage par décalage de la campagne précédente). Écrit
// `kvk_config/current.timeline` (King-only, règle Firestore existante), consommé par
// CampaignTimelineBanner dans l'onglet Objectifs. Config par instance/campagne.

let _rid = 0;
const newRid = () => `r${++_rid}`;

// Découpe un ISO UTC en {date:'YYYY-MM-DD', time:'HH:MM'} pour les <input>.
const splitAt = (at) => {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return { date: '', time: '' };
    const iso = d.toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const CATEGORIES = ['event', 'pass', 'major'];

const CampaignTimelineEditor = () => {
    const { t } = useTranslation();
    const { isAuthorized } = useRole();
    const authorized = isAuthorized([ROLES.KING]);

    const [rows, setRows] = useState([]);
    const [shiftDays, setShiftDays] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        if (!authorized) return;
        (async () => {
            try {
                // Doc dédié `kvk_config/timeline` (découplé de `current` : KvKConfigForm
                // écrase `current` sans merge et effacerait la timeline sinon).
                const snap = await getDoc(doc(db, 'kvk_config', 'timeline'));
                const tl = (snap.exists() && Array.isArray(snap.data().events)) ? snap.data().events : [];
                const sorted = [...tl].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
                setRows(sorted.map((e) => ({ _rid: newRid(), key: e.key || '', label: e.label || '', category: e.category || 'event', ...splitAt(e.at) })));
            } catch (err) {
                console.error('timeline load error:', err);
            }
        })();
    }, [authorized]);

    if (!authorized) return null;

    const update = (rid, field, value) => setRows((rs) => rs.map((r) => (r._rid === rid ? { ...r, [field]: value } : r)));
    const remove = (rid) => setRows((rs) => rs.filter((r) => r._rid !== rid));
    const addRow = () => setRows((rs) => [...rs, { _rid: newRid(), key: '', label: '', category: 'event', date: '', time: '15:00' }]);

    // Pré-remplissage saison-à-saison : décale toutes les dates de N jours (garde les heures).
    const applyShift = () => {
        const n = Number(shiftDays);
        if (!Number.isFinite(n) || n === 0) return;
        setRows((rs) => rs.map((r) => {
            if (!r.date) return r;
            const d = new Date(`${r.date}T${r.time || '00:00'}:00Z`);
            if (Number.isNaN(d.getTime())) return r;
            d.setUTCDate(d.getUTCDate() + n);
            const iso = d.toISOString();
            return { ...r, date: iso.slice(0, 10), time: iso.slice(11, 16) };
        }));
        setShiftDays('');
    };

    const save = async () => {
        setLoading(true); setMessage(''); setIsError(false);
        try {
            const usedKeys = new Set();
            const timeline = rows
                .filter((r) => r.label.trim() && r.date)
                .map((r) => {
                    let key = r.key || slug(r.label);
                    while (!key || usedKeys.has(key)) key = `${slug(r.label) || 'evt'}_${Math.floor(Math.random() * 1e4)}`;
                    usedKeys.add(key);
                    return { key, label: r.label.trim(), category: r.category || 'event', at: `${r.date}T${(r.time || '00:00')}:00Z` };
                })
                .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
            await setDoc(doc(db, 'kvk_config', 'timeline'), { events: timeline, updatedAt: new Date().toISOString() }, { merge: true });
            setMessage(t('admin.cal_saved', { count: timeline.length }));
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('timeline save error:', err);
            setMessage(t('admin.cal_save_error'));
            setIsError(true);
        }
        setLoading(false);
    };

    return (
        <Card>
            <div className="flex items-center gap-2 mb-2 text-indigo-300">
                <Calendar size={20} />
                <h2 className="text-lg font-bold">{t('admin.cal_title')}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-5">{t('admin.cal_desc')}</p>

            {rows.length === 0 && (
                <p className="text-sm text-slate-500 mb-4">{t('admin.cal_empty')}</p>
            )}

            <div className="space-y-2 mb-4">
                {rows.map((r) => (
                    <div key={r._rid} className="flex flex-col sm:flex-row gap-2 sm:items-center p-2 rounded-lg border border-[var(--border-flat)] bg-[var(--surface-solid)]">
                        <input
                            type="text"
                            value={r.label}
                            onChange={(e) => update(r._rid, 'label', e.target.value)}
                            placeholder={t('admin.cal_event_ph')}
                            aria-label={t('admin.cal_event_label')}
                            className="flex-1 min-w-0 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-white min-h-[40px]"
                        />
                        <div className="flex gap-2 shrink-0">
                            <input
                                type="date"
                                value={r.date}
                                onChange={(e) => update(r._rid, 'date', e.target.value)}
                                aria-label={t('admin.cal_date')}
                                className="bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-slate-200 min-h-[40px]"
                            />
                            <input
                                type="time"
                                value={r.time}
                                onChange={(e) => update(r._rid, 'time', e.target.value)}
                                aria-label={t('admin.cal_time')}
                                className="bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-slate-200 min-h-[40px]"
                            />
                            <select
                                value={r.category}
                                onChange={(e) => update(r._rid, 'category', e.target.value)}
                                aria-label={t('admin.cal_category')}
                                className="bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-slate-200 min-h-[40px]"
                            >
                                {CATEGORIES.map((c) => <option key={c} value={c}>{t(`admin.cal_cat_${c}`)}</option>)}
                            </select>
                            <button
                                type="button"
                                onClick={() => remove(r._rid)}
                                aria-label={t('admin.cal_delete')}
                                className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-300 hover:text-indigo-200 mb-5"
            >
                <Plus size={16} /> {t('admin.cal_add')}
            </button>

            {/* Pré-remplissage : décaler toute la campagne vers la saison suivante (heures conservées). */}
            <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-[var(--border-flat)] mb-5">
                <div className="min-w-0">
                    <label className="block text-xs text-slate-400 mb-1">{t('admin.cal_shift')}</label>
                    <input
                        type="number"
                        value={shiftDays}
                        onChange={(e) => setShiftDays(e.target.value)}
                        placeholder="ex : 59"
                        className="w-28 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-slate-200 min-h-[40px]"
                    />
                </div>
                <Button type="button" variant="outline" onClick={applyShift} className="whitespace-nowrap">
                    {t('admin.cal_shift_apply')}
                </Button>
                <p className="text-[11px] text-slate-500 basis-full sm:basis-auto">{t('admin.cal_shift_hint')}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className={`text-sm ${isError ? 'text-red-400' : 'text-green-400'}`}>{message}</span>
                <Button type="button" onClick={save} disabled={loading} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 justify-center">
                    <Save size={18} className="mr-2 hidden sm:inline-block" />
                    {t('admin.cal_save')}
                </Button>
            </div>
        </Card>
    );
};

export default CampaignTimelineEditor;
