import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { completeness, emptySheet } from '../../lib/mentoringSchema';
import { ScrollText, CheckCircle2, ArrowRight } from '../ui/icons';

/**
 * MySheetCard — E-010 / F-039 : état de la fiche de compte sur `/me`.
 *
 * Lecture seule et non bloquante : si la fiche n'existe pas, ou si la lecture est
 * refusée, la carte affiche « à remplir » plutôt que de faire échouer la page.
 * Un joueur sans compte principal réclamé ne la voit pas du tout — il n'aurait
 * rien à remplir, et le message utile est ailleurs (réclamer son gouverneur).
 */
const MySheetCard = () => {
    const { t } = useTranslation();
    const { currentUser, accounts, governorId } = useAuth();
    const [state, setState] = useState({ loading: true, exists: false, percent: 0, updatedAt: null, byOther: false });

    const warAccounts = (accounts || []).filter((a) => a.type !== 'filler');
    const gid = governorId || warAccounts[0]?.governorId || null;

    useEffect(() => {
        let alive = true;
        // Pas de `setState` synchrone ici : sans compte principal, le rendu
        // court-circuite plus bas (`if (!gid) return null`), il n'y a rien à
        // synchroniser — et un setState dans le corps d'un effet déclenche une
        // cascade de rendus.
        if (!currentUser || !gid) return undefined;
        getDoc(doc(db, 'mentoring_sheets', String(gid)))
            .then((snap) => {
                if (!alive) return;
                if (!snap.exists()) {
                    setState({ loading: false, exists: false, percent: 0, updatedAt: null, byOther: false });
                    return;
                }
                const d = snap.data();
                setState({
                    loading: false,
                    exists: true,
                    percent: completeness({ ...emptySheet(), ...(d.blocks || {}) }).percent,
                    updatedAt: d.updatedAt || null,
                    // Le joueur doit savoir que quelqu'un a rempli pour lui.
                    byOther: !!d.enteredBy && d.enteredBy !== currentUser.uid,
                });
            })
            .catch(() => { if (alive) setState((s) => ({ ...s, loading: false })); });
        return () => { alive = false; };
    }, [currentUser, gid]);

    if (!gid || state.loading) return null;

    const pct = Math.round(state.percent * 100);
    const done = state.percent === 1;

    return (
        <section className="v2-glass p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-white mb-1">
                        <ScrollText size={19} weight="duotone" className="text-amber-400" />
                        {t('mentoring.card_title')}
                    </h2>
                    <p className="text-xs text-[var(--text-meta)]">
                        {done
                            ? t('mentoring.card_complete')
                            : state.exists
                                ? t('mentoring.card_in_progress', { percent: pct })
                                : t('mentoring.card_todo')}
                    </p>
                    {state.byOther && (
                        <p className="text-xs text-amber-400 mt-1.5">{t('mentoring.card_by_other')}</p>
                    )}
                </div>
                <Link
                    to={`/fiche?gov=${encodeURIComponent(gid)}`}
                    className="flex items-center justify-center gap-2 px-5 min-h-[44px] text-[13px] font-bold rounded-xl btn-grad-primary text-white shrink-0"
                >
                    {state.exists ? t('mentoring.card_continue') : t('mentoring.card_start')}
                    <ArrowRight size={16} />
                </Link>
            </div>

            {state.exists && !done && (
                <div className="h-2 rounded-full bg-[var(--border-flat)] overflow-hidden mt-3" role="progressbar"
                    aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--grad-accent)' }} />
                </div>
            )}
            {done && (
                <p className="flex items-center gap-2 text-xs text-emerald-400 mt-3">
                    <CheckCircle2 size={14} /> {t('mentoring.card_done_hint')}
                </p>
            )}
        </section>
    );
};

export default MySheetCard;
