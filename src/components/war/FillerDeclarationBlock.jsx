import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Avatar from '../ui/Avatar';
import { Save } from '../ui/icons';

/**
 * FillerDeclarationBlock — déclaration de guerre allégée pour les comptes filler
 * (E-007/F-026, spec §7.1). L'utilisateur coche un ou plusieurs de ses comptes
 * filler et saisit les troupes T4/T5 disponibles pour chacun ; seuls les comptes
 * cochés sont écrits. Chaque déclaration filler = un doc war_availabilities à
 * docId 3 segments `${kvkId}_${uid}_${governorId}`, avec accountType:'filler' et
 * filler:{t4,t5} — consommé plus tard par l'objectif filler (F-027).
 *
 * Le pouvoir déclaré = 4×T4 + 10×T5 (BR-018) est calculé au moment de l'objectif,
 * pas ici : on ne stocke que les troupes déclarées.
 *
 * Props :
 *  - fillerAccounts : [{ governorId, type:'filler', name }]
 *  - uid : identifiant de l'utilisateur connecté (currentUser.uid)
 *  - kvkId, kvkName : campagne active
 *  - resolveName(governorId) : nom live (par id) ; repli sur le nom stocké
 *  - disabled : campagne clôturée (BR-013)
 */
const FillerDeclarationBlock = ({ fillerAccounts, uid, kvkId, kvkName, resolveName, disabled }) => {
    const { t } = useTranslation();
    // rows[gid] = { checked, t4, t5 }
    const [rows, setRows] = useState({});
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    // Charge les déclarations filler existantes pour cette campagne.
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!uid || !kvkId) return;
            const next = {};
            for (const acc of fillerAccounts) {
                const gid = String(acc.governorId);
                next[gid] = { checked: false, t4: '', t5: '' };
                try {
                    const sn = await getDoc(doc(db, 'war_availabilities', `${kvkId}_${uid}_${gid}`));
                    if (sn.exists()) {
                        const f = sn.data().filler || {};
                        next[gid] = { checked: true, t4: f.t4 ?? '', t5: f.t5 ?? '' };
                    }
                } catch { /* lecture best-effort */ }
            }
            if (!cancelled) setRows(next);
        };
        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kvkId, uid, fillerAccounts.map((a) => a.governorId).join(',')]);

    const setRow = (gid, patch) => setRows((prev) => ({ ...prev, [gid]: { ...prev[gid], ...patch } }));

    const handleSave = async () => {
        setLoading(true); setMsg(''); setErr('');
        try {
            const checked = fillerAccounts.filter((a) => rows[String(a.governorId)]?.checked);
            for (const acc of checked) {
                const gid = String(acc.governorId);
                const r = rows[gid];
                await setDoc(doc(db, 'war_availabilities', `${kvkId}_${uid}_${gid}`), {
                    governorId: gid,
                    governorName: resolveName(gid),
                    accountType: 'filler',
                    filler: { t4: Number(r.t4) || 0, t5: Number(r.t5) || 0 },
                    userId: uid,
                    kvkId,
                    kvkName: kvkName || 'Unknown',
                    updatedAt: Timestamp.now(),
                }, { merge: true });
            }
            setMsg(t('war.submit_success'));
        } catch (e) {
            console.error('Filler save error:', e);
            setErr(t('war.submit_error'));
        }
        setLoading(false);
    };

    if (!fillerAccounts.length) return null;

    return (
        <div className="bg-[var(--border-flat)] p-3 md:p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-400 mb-1">{t('war.filler_section')}</h3>
            <p className="text-xs text-slate-500 mb-3">{t('war.filler_hint')}</p>
            <div className="space-y-2">
                {fillerAccounts.map((acc) => {
                    const gid = String(acc.governorId);
                    const r = rows[gid] || { checked: false, t4: '', t5: '' };
                    const name = resolveName(gid);
                    return (
                        <div key={gid} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border transition-colors ${r.checked ? 'bg-slate-800/60 border-amber-500/30' : 'bg-[var(--surface-solid)] border-[var(--border-flat)]'}`}>
                            <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!r.checked}
                                    disabled={disabled}
                                    onChange={(e) => setRow(gid, { checked: e.target.checked })}
                                    className="w-5 h-5 accent-amber-500 shrink-0"
                                />
                                <Avatar id={gid} name={name} size="sm" className="shrink-0" />
                                <span className="text-sm font-bold text-white truncate">{name}</span>
                            </label>
                            <div className="flex items-center gap-2 shrink-0">
                                <Input label={t('war.filler_t4')} type="number" value={r.t4} disabled={disabled || !r.checked} onChange={(e) => setRow(gid, { t4: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} placeholder={t('war.example', { v: '20000' })} className="w-28" />
                                <Input label={t('war.filler_t5')} type="number" value={r.t5} disabled={disabled || !r.checked} onChange={(e) => setRow(gid, { t5: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} placeholder={t('war.example', { v: '10000' })} className="w-28" />
                            </div>
                        </div>
                    );
                })}
            </div>
            {msg && <p className="text-emerald-400 text-sm mt-3">{msg}</p>}
            {err && <p className="text-red-400 text-sm mt-3">{err}</p>}
            <div className="mt-4">
                <Button onClick={handleSave} disabled={loading || disabled} className="flex items-center gap-2">
                    <Save size={16} /> {t('war.filler_save')}
                </Button>
            </div>
        </div>
    );
};

export default FillerDeclarationBlock;
