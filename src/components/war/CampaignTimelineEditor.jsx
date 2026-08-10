import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRole, ROLES } from '../../context/RoleContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Calendar, Save, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp } from '../ui/icons';

// F-031 / US-035 (E-008) — Éditeur King du calendrier KvK (section « Calendrier » de /admin).
// Écrit un doc DÉDIÉ `kvk_config/timeline` (champ `events`), estampillé de la campagne
// courante (`campaignId`/`campaignName`) — découplé de `kvk_config/current` que KvKConfigForm
// écrase sans merge. Consommé par CampaignTimelineBanner (onglet Objectifs, Warriors+).

let _rid = 0;
const newRid = () => `r${++_rid}`;

const splitAt = (at) => {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return { date: '', time: '' };
    const iso = d.toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const CATEGORIES = ['event', 'pass', 'major'];

// Devine le type depuis le libellé (le King peut corriger).
const guessCategory = (label) => {
    const l = label.toLowerCase();
    if (/\bpass\b/.test(l)) return 'pass';
    if (/altar|ziggurat|clash/.test(l)) return 'major';
    return 'event';
};

// Parseur de collage : accepte le format copié depuis un tableur (TSV : « Libellé <tab>
// date & heure »), ou une ligne où la date « JJ Mois … H:MM » est en fin. Heures en UTC.
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseEventLine(line, defaultYear) {
    const raw = String(line).replace(/\s+$/, '');
    if (!raw.trim()) return null;
    let label, dt;
    if (raw.includes('\t')) { const p = raw.split('\t'); dt = p.pop().trim(); label = p.join(' ').trim(); }
    else {
        const m = raw.match(/(\d{1,2}\s+[A-Za-z]{3,}.*\d{1,2}:\d{2}.*)$/);
        if (!m) return null;
        dt = m[1].trim();
        label = raw.slice(0, m.index).replace(/[,;|\s]+$/, '').trim();
    }
    const timeM = dt.match(/(\d{1,2}):(\d{2})/);
    const dayMonM = dt.match(/(\d{1,2})\s+([A-Za-z]{3,})/);
    if (!timeM || !dayMonM) return null;
    const mon = MONTHS[dayMonM[2].slice(0, 3).toLowerCase()];
    if (mon == null) return null;
    const yearM = dt.match(/\b(20\d{2})\b/);
    const year = yearM ? Number(yearM[1]) : defaultYear;
    const d = new Date(Date.UTC(year, mon, Number(dayMonM[1]), Number(timeM[1]), Number(timeM[2])));
    if (Number.isNaN(d.getTime())) return null;
    const iso = d.toISOString();
    return { label: label || '?', date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

const CampaignTimelineEditor = () => {
    const { t } = useTranslation();
    const { isAuthorized } = useRole();
    const authorized = isAuthorized([ROLES.KING]);

    const [rows, setRows] = useState([]);
    const [current, setCurrent] = useState(null);   // campagne courante {id, name, year}
    const [storedCid, setStoredCid] = useState(null); // campaignId estampillé sur la timeline
    const [storedCname, setStoredCname] = useState(null);
    const [shiftDays, setShiftDays] = useState('');
    const [pasteOpen, setPasteOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [pasteYear, setPasteYear] = useState('');
    const [pasteMsg, setPasteMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        if (!authorized) return;
        (async () => {
            try {
                const [tlSnap, cfgSnap] = await Promise.all([
                    getDoc(doc(db, 'kvk_config', 'timeline')),
                    getDoc(doc(db, 'kvk_config', 'current')),
                ]);
                const tl = (tlSnap.exists() && Array.isArray(tlSnap.data().events)) ? tlSnap.data().events : [];
                const sorted = [...tl].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
                setRows(sorted.map((e) => ({ _rid: newRid(), key: e.key || '', label: e.label || '', category: e.category || 'event', ...splitAt(e.at) })));
                if (tlSnap.exists()) { setStoredCid(tlSnap.data().campaignId || null); setStoredCname(tlSnap.data().campaignName || null); }
                if (cfgSnap.exists()) {
                    const c = cfgSnap.data();
                    const year = c.startDate?.seconds ? new Date(c.startDate.seconds * 1000).getUTCFullYear() : new Date().getUTCFullYear();
                    setCurrent({ id: c.id || null, name: c.name || null, year });
                    setPasteYear(String(year));
                }
            } catch (err) {
                console.error('timeline load error:', err);
            }
        })();
    }, [authorized]);

    if (!authorized) return null;

    const mismatch = storedCid && current?.id && storedCid !== current.id;

    const update = (rid, field, value) => setRows((rs) => rs.map((r) => (r._rid === rid ? { ...r, [field]: value } : r)));
    const remove = (rid) => setRows((rs) => rs.filter((r) => r._rid !== rid));
    const addRow = () => setRows((rs) => [...rs, { _rid: newRid(), key: '', label: '', category: 'event', date: '', time: '15:00' }]);

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

    // Coller-importer : remplace la liste par les lignes parsées (le King enregistre ensuite).
    const applyPaste = () => {
        const yr = Number(pasteYear) || new Date().getUTCFullYear();
        const lines = pasteText.split('\n');
        let ok = 0, skipped = 0;
        const parsed = [];
        for (const line of lines) {
            if (!line.trim()) continue;
            const e = parseEventLine(line, yr);
            if (e) { parsed.push({ _rid: newRid(), key: '', label: e.label, category: guessCategory(e.label), date: e.date, time: e.time }); ok++; }
            else skipped++;
        }
        if (ok > 0) setRows(parsed.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)));
        setPasteMsg(t('admin.cal_paste_result', { ok, skipped }));
    };

    const save = async () => {
        setLoading(true); setMessage(''); setIsError(false);
        try {
            const usedKeys = new Set();
            const events = rows
                .filter((r) => r.label.trim() && r.date)
                .map((r) => {
                    let key = r.key || slug(r.label);
                    while (!key || usedKeys.has(key)) key = `${slug(r.label) || 'evt'}_${Math.floor(Math.random() * 1e4)}`;
                    usedKeys.add(key);
                    return { key, label: r.label.trim(), category: r.category || 'event', at: `${r.date}T${(r.time || '00:00')}:00Z` };
                })
                .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
            await setDoc(doc(db, 'kvk_config', 'timeline'), {
                events,
                campaignId: current?.id || null,     // estampille la campagne courante (lien explicite)
                campaignName: current?.name || null,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            setStoredCid(current?.id || null);
            setStoredCname(current?.name || null);
            setMessage(t('admin.cal_saved', { count: events.length }));
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
            <div className="flex items-center gap-2 mb-1 text-indigo-300">
                <Calendar size={20} />
                <h2 className="text-lg font-bold">{t('admin.cal_title')}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-1">{t('admin.cal_desc')}</p>
            <p className="text-xs text-slate-500 mb-4">
                {current?.name ? t('admin.cal_for_campaign', { name: current.name }) : t('admin.cal_no_campaign')}
            </p>

            {mismatch && (
                <div className="flex items-start gap-2.5 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    <p>{t('admin.cal_mismatch', { name: storedCname || '?' })}</p>
                </div>
            )}

            {/* Coller-importer depuis un tableur (réduit la saisie manuelle) */}
            <div className="mb-4 rounded-lg border border-[var(--border-flat)]">
                <button type="button" onClick={() => setPasteOpen((v) => !v)} className="w-full flex items-center justify-between p-3 text-sm font-semibold text-indigo-300">
                    <span>{t('admin.cal_paste_toggle')}</span>
                    {pasteOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {pasteOpen && (
                    <div className="p-3 pt-0 space-y-2">
                        <p className="text-xs text-slate-500">{t('admin.cal_paste_desc')}</p>
                        <textarea
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            rows={5}
                            placeholder={"LK Opening\tFri, 31 Jul 0:00 UTC\nPass 4 (Z5)\tFri, 7 Aug 15:00 UTC"}
                            className="w-full bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-xs font-mono text-slate-200"
                        />
                        <div className="flex flex-wrap items-end gap-2">
                            <div>
                                <label className="block text-[11px] text-slate-400 mb-1">{t('admin.cal_paste_year')}</label>
                                <input type="number" value={pasteYear} onChange={(e) => setPasteYear(e.target.value)} className="w-24 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-slate-200 min-h-[40px]" />
                            </div>
                            <Button type="button" variant="outline" onClick={applyPaste} className="whitespace-nowrap">{t('admin.cal_paste_apply')}</Button>
                            {pasteMsg && <span className="text-[11px] text-slate-400 basis-full sm:basis-auto">{pasteMsg}</span>}
                        </div>
                    </div>
                )}
            </div>

            {rows.length === 0 && <p className="text-sm text-slate-500 mb-4">{t('admin.cal_empty')}</p>}

            <div className="space-y-2 mb-4">
                {rows.map((r) => (
                    <div key={r._rid} className="flex flex-col sm:flex-row gap-2 sm:items-center p-2 rounded-lg border border-[var(--border-flat)] bg-[var(--surface-solid)]">
                        <input type="text" value={r.label} onChange={(e) => update(r._rid, 'label', e.target.value)} placeholder={t('admin.cal_event_ph')} aria-label={t('admin.cal_event_label')} className="flex-1 min-w-0 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-white min-h-[40px]" />
                        <div className="flex gap-2 shrink-0">
                            <input type="date" value={r.date} onChange={(e) => update(r._rid, 'date', e.target.value)} aria-label={t('admin.cal_date')} className="bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-slate-200 min-h-[40px]" />
                            <input type="time" value={r.time} onChange={(e) => update(r._rid, 'time', e.target.value)} aria-label={t('admin.cal_time')} className="bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-slate-200 min-h-[40px]" />
                            <select value={r.category} onChange={(e) => update(r._rid, 'category', e.target.value)} aria-label={t('admin.cal_category')} className="bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-slate-200 min-h-[40px]">
                                {CATEGORIES.map((c) => <option key={c} value={c}>{t(`admin.cal_cat_${c}`)}</option>)}
                            </select>
                            <button type="button" onClick={() => remove(r._rid)} aria-label={t('admin.cal_delete')} className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 text-sm text-indigo-300 hover:text-indigo-200 mb-5">
                <Plus size={16} /> {t('admin.cal_add')}
            </button>

            <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-[var(--border-flat)] mb-5">
                <div className="min-w-0">
                    <label className="block text-xs text-slate-400 mb-1">{t('admin.cal_shift')}</label>
                    <input type="number" value={shiftDays} onChange={(e) => setShiftDays(e.target.value)} placeholder="59" className="w-28 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-md px-2 py-2 text-sm text-slate-200 min-h-[40px]" />
                </div>
                <Button type="button" variant="outline" onClick={applyShift} className="whitespace-nowrap">{t('admin.cal_shift_apply')}</Button>
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
