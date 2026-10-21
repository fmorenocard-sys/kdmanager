import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useData } from '../../context/DataContext';
import { completeness, emptySheet } from '../../lib/mentoringSchema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import EmptyState from '../ui/EmptyState';
import StatusFilter from '../ui/StatusFilter';
import { ScrollText, CheckCircle2, Clock, AlertTriangle, ArrowRight } from '../ui/icons';

/**
 * SheetTracking — E-010 / F-039, besoins B10 et B11 du brief.
 *
 * « Le conseil voit en UN écran qui a rempli sa fiche et qui ne l'a pas fait »
 * (critère de réussite n°3). Le dénominateur est le **périmètre copié** dans
 * `mentoring_program/main` (BR-031) — jamais `static_data/kvk` en direct, qui est
 * réécrite à chaque ouverture de KvK et ferait bouger le périmètre tout seul.
 *
 * Un compte du périmètre sans fiche apparaît quand même, en « à faire » : c'est
 * tout l'intérêt de l'écran. Lister seulement les fiches existantes répondrait à
 * la mauvaise question.
 */

const STATES = ['todo', 'doing', 'done'];

const stateBadge = (state, t) => {
    const map = {
        done: { cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', Icon: CheckCircle2 },
        doing: { cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30', Icon: Clock },
        todo: { cls: 'text-red-400 bg-red-500/10 border-red-500/30', Icon: AlertTriangle },
    };
    const { cls, Icon } = map[state];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>
            <Icon size={12} /> {t(`mentoring.state_${state}`)}
        </span>
    );
};

const SheetTracking = () => {
    const { t } = useTranslation();
    const { players } = useData();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const prog = await getDoc(doc(db, 'mentoring_program', 'main'));
                const scope = prog.exists() ? (prog.data().scopeGovernorIds || []).map(String) : [];
                const sheets = await getDocs(collection(db, 'mentoring_sheets'));
                const byGov = new Map(sheets.docs.map((d) => [String(d.id), d.data()]));

                // Le périmètre fait foi ; une fiche hors périmètre est tout de même
                // listée (compte ajouté après coup, ou retiré du programme).
                const ids = [...new Set([...scope, ...byGov.keys()])];
                const list = ids.map((gid) => {
                    const s = byGov.get(gid);
                    const pct = s ? completeness({ ...emptySheet(), ...(s.blocks || {}) }).percent : 0;
                    return {
                        gid,
                        name: s?.name || (players || []).find((p) => String(p.id) === gid)?.name || gid,
                        inScope: scope.includes(gid),
                        exists: !!s,
                        percent: pct,
                        state: !s ? 'todo' : pct === 1 ? 'done' : 'doing',
                        enteredByRole: s?.enteredByRole || null,
                        updatedAt: s?.updatedAt || null,
                    };
                });
                // À faire d'abord : l'écran sert à voir qui manque, pas à féliciter.
                const order = { todo: 0, doing: 1, done: 2 };
                list.sort((a, b) => order[a.state] - order[b.state] || String(a.name).localeCompare(String(b.name)));
                if (alive) setRows(list);
            } catch (err) {
                console.error('[SheetTracking] lecture impossible', err);
                if (alive) setError(err);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [players]);

    const counts = useMemo(() => {
        const c = { all: rows.length, todo: 0, doing: 0, done: 0 };
        for (const r of rows) c[r.state]++;
        return c;
    }, [rows]);

    const shown = useMemo(
        () => (filter === 'all' ? rows : rows.filter((r) => r.state === filter)),
        [rows, filter]
    );

    if (loading) return <div className="p-8 text-center text-muted">{t('common.loading')}</div>;

    if (error) {
        return <EmptyState icon={AlertTriangle} title={t('mentoring.tracking_error')} />;
    }

    if (!rows.length) {
        return <EmptyState icon={ScrollText} title={t('mentoring.tracking_empty')} />;
    }

    return (
        <div className="space-y-5">
            {/* Compteurs — la réponse à « où en est-on » tient en une ligne */}
            <section className="v2-glass p-4 md:p-5">
                <h2 className="text-[15px] font-semibold text-white mb-3">{t('mentoring.tracking_title')}</h2>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {STATES.map((s) => (
                        <div key={s} className="px-3 py-2 rounded-[10px] bg-[var(--border-flat)] min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 truncate">{t(`mentoring.state_${s}`)}</p>
                            <p className="font-mono font-bold text-lg text-white">{counts[s]}</p>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-[var(--text-meta)] mt-3">
                    {t('mentoring.tracking_hint', { done: counts.done, total: counts.all })}
                </p>
            </section>

            {/* API du composant : `selected` est une LISTE, vide = « All ».
                `onSelect` reçoit la valeur cliquée et c'est au parent de basculer. */}
            <StatusFilter
                options={STATES.map((s) => ({
                    value: s,
                    label: t(`mentoring.state_${s}`),
                    count: counts[s],
                    colorClass: s === 'done' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : s === 'doing' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                            : 'text-red-400 bg-red-500/10 border-red-500/30',
                }))}
                selected={filter === 'all' ? [] : [filter]}
                onSelect={(v) => setFilter((prev) => (v === 'all' || prev === v ? 'all' : v))}
            />

            {/* Mobile : cartes. Desktop : table. Jamais de scroll horizontal. */}
            <div className="md:hidden space-y-2">
                {shown.map((r) => (
                    <div key={r.gid} className="v2-glass p-3.5 flex items-center justify-between gap-3 min-w-0">
                        <div className="min-w-0">
                            <p className="font-semibold text-sm text-white truncate">{r.name}</p>
                            <p className="text-[11px] text-[var(--text-meta)] font-mono">{r.gid}</p>
                            <div className="mt-1.5">{stateBadge(r.state, t)}</div>
                        </div>
                        <Link to={`/fiche?gov=${encodeURIComponent(r.gid)}`}
                            className="shrink-0 flex items-center gap-1.5 px-3 min-h-[44px] text-xs font-bold rounded-xl border border-[var(--border-flat)] text-[var(--text-secondary)]">
                            {t('mentoring.open_sheet')} <ArrowRight size={14} />
                        </Link>
                    </div>
                ))}
            </div>

            <div className="hidden md:block v2-glass p-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('mentoring.col_player')}</TableHead>
                            <TableHead>{t('mentoring.col_state')}</TableHead>
                            <TableHead>{t('mentoring.col_progress')}</TableHead>
                            <TableHead>{t('mentoring.col_entered_by')}</TableHead>
                            <TableHead>{t('mentoring.col_updated')}</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shown.map((r) => (
                            <TableRow key={r.gid}>
                                <TableCell>
                                    <span className="font-semibold text-white">{r.name}</span>
                                    <span className="ms-2 text-xs text-[var(--text-meta)] font-mono">{r.gid}</span>
                                    {!r.inScope && (
                                        <span className="ms-2 text-[10px] text-amber-400">{t('mentoring.out_of_scope')}</span>
                                    )}
                                </TableCell>
                                <TableCell>{stateBadge(r.state, t)}</TableCell>
                                <TableCell className="font-mono text-sm">{Math.round(r.percent * 100)} %</TableCell>
                                <TableCell className="text-sm text-[var(--text-secondary)]">{r.enteredByRole || '—'}</TableCell>
                                <TableCell className="text-sm text-[var(--text-meta)]">
                                    {r.updatedAt ? String(r.updatedAt).slice(0, 10) : '—'}
                                </TableCell>
                                <TableCell>
                                    <Link to={`/fiche?gov=${encodeURIComponent(r.gid)}`}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:underline">
                                        {t('mentoring.open_sheet')} <ArrowRight size={14} />
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default SheetTracking;
