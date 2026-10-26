import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useData } from '../../context/DataContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Search, ShieldAlert, Users } from '../ui/icons';

/**
 * AccessMatrix — « qui a les droits, précisément ». Lecture seule.
 *
 * La source est la collection `roles` : un document par utilisateur, écrit par
 * `discordAuth` à chaque connexion (`{ role, updatedAt, source }`). Trois limites
 * en découlent, dites sur la page plutôt que tues, parce qu'elles changent la
 * lecture qu'on fait du tableau :
 *
 *  1. **Seuls ceux qui se sont connectés au moins une fois y figurent.** Un
 *     Officier Discord qui n'a jamais ouvert l'app n'a pas de document, donc pas
 *     de ligne. L'écran répond « qui détient des droits DANS l'app », pas « qui
 *     porte le rôle sur Discord ».
 *  2. **Le rôle est figé à la connexion.** Un changement de rôle Discord ne se
 *     propage qu'à la prochaine synchro de l'intéressé — d'où la colonne
 *     « Dernière synchro », qui est le vrai sujet quand une ligne surprend.
 *  3. **Les épinglages par variable d'environnement sont invisibles ici.**
 *     `ROLE_ADMIN_USER_IDS` et `ROLE_KING_USER_IDS` (BR-023) décident du rôle au
 *     moment de l'échelle, mais rien dans Firestore ne garde la trace du motif :
 *     le document dit « King », jamais « King parce qu'épinglé ».
 *
 * Lecture autorisée au leadership par `firestore.rules` (`roles` et
 * `user_profiles` : `isOwner(userId) || isKingOrOfficer()`), donc la requête de
 * collection passe pour un Roi, un Officier ou un Admin.
 */

// Ordre d'affichage = ordre de la hiérarchie (RoleContext : Admin 5 > King 4 >
// Officer 3), pas l'ordre alphabétique : la page sert à voir qui est au-dessus.
const LEADERSHIP = ['Admin', 'King', 'Officer'];
const PILL = { Admin: 'role-admin', King: 'role-king', Officer: 'neutral' };
const ROLE_KEY = {
    Admin: 'profile.role_admin',
    King: 'profile.role_king',
    Officer: 'profile.role_officer',
    Warrior: 'profile.role_warrior',
};

/** `discord:123456` → `123456`. Un uid Google n'a pas ce préfixe (E-001). */
const discordIdOf = (uid) => (uid.startsWith('discord:') ? uid.slice('discord:'.length) : null);

const AccessMatrix = () => {
    const { t, i18n } = useTranslation();
    const { players } = useData();

    const [rows, setRows] = useState([]);
    const [others, setOthers] = useState({ Warrior: 0, Guest: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [q, setQ] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setError(false);
            try {
                const snap = await getDocs(collection(db, 'roles'));
                if (!alive) return;

                const all = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
                const leadership = all.filter((r) => LEADERSHIP.includes(r.role));

                // Profils lus UN PAR UN, et seulement pour le leadership : une
                // requête de collection sur `user_profiles` tirerait tout le
                // royaume pour n'en afficher qu'une dizaine de lignes.
                const enriched = await Promise.all(leadership.map(async (r) => {
                    let governorId = null;
                    let accounts = [];
                    try {
                        const p = await getDoc(doc(db, 'user_profiles', r.uid));
                        if (p.exists()) {
                            governorId = p.data().governorId || null;
                            accounts = p.data().accounts || [];
                        }
                    } catch { /* profil illisible : la ligne vaut quand même */ }
                    return { ...r, governorId, accountCount: accounts.length };
                }));

                const tally = { Warrior: 0, Guest: 0 };
                all.forEach((r) => { if (r.role in tally) tally[r.role] += 1; });

                setRows(enriched);
                setOthers(tally);
            } catch (e) {
                console.warn('[AccessMatrix] lecture des rôles refusée', e);
                if (alive) setError(true);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const nameOf = (governorId) => {
        if (!governorId) return null;
        const p = (players || []).find((x) => String(x.id) === String(governorId));
        return p?.name || null;
    };

    const fmtDate = (ts) => {
        const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
        if (!d || Number.isNaN(d.getTime())) return t('admin.access.never_synced');
        return new Intl.DateTimeFormat(i18n.language || 'en', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        }).format(d);
    };

    const view = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return rows
            .map((r) => ({ ...r, name: nameOf(r.governorId), discordId: discordIdOf(r.uid) }))
            .filter((r) => !needle
                || (r.name || '').toLowerCase().includes(needle)
                || String(r.governorId || '').includes(needle)
                || r.uid.toLowerCase().includes(needle))
            .sort((a, b) => {
                const d = LEADERSHIP.indexOf(a.role) - LEADERSHIP.indexOf(b.role);
                if (d !== 0) return d;
                return (a.name || a.uid).localeCompare(b.name || b.uid);
            });
        // `players` participe au rendu via nameOf : il doit déclencher un recalcul.
    }, [rows, q, players]); // eslint-disable-line react-hooks/exhaustive-deps

    const counts = useMemo(() => {
        const c = { Admin: 0, King: 0, Officer: 0 };
        rows.forEach((r) => { if (r.role in c) c[r.role] += 1; });
        return c;
    }, [rows]);

    if (error) {
        return (
            <div className="v2-glass p-4 md:p-5 flex items-start gap-3">
                <ShieldAlert size={18} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--text-secondary)]">{t('admin.access.error')}</p>
            </div>
        );
    }

    const identity = (r) => (
        <span className="font-mono text-[11px] text-[var(--text-meta)]">
            {r.discordId ? `Discord ${r.discordId}` : r.uid}
        </span>
    );

    const roleCell = (r) => (
        <span className={`v2-pill ${PILL[r.role] || 'neutral'}`}>{t(ROLE_KEY[r.role] || 'profile.role')}</span>
    );

    return (
        <div className="flex flex-col gap-4">
            <div className="v2-glass p-4 md:p-5 flex flex-col gap-4">
                <p className="text-sm text-[var(--text-secondary)]">{t('admin.access.desc')}</p>

                {/* Trois compteurs : le haut de la hiérarchie en un coup d'œil. */}
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {LEADERSHIP.map((role) => (
                        <div key={role} className="bg-[var(--border-flat)] rounded-lg px-3 py-2.5">
                            <div className="text-[11px] text-[var(--text-secondary)]">{t(ROLE_KEY[role])}</div>
                            <div className="font-mono text-xl font-bold text-[var(--text-primary)] tabular-nums">
                                {loading ? '—' : counts[role]}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="relative w-full md:max-w-sm">
                    <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-meta)] pointer-events-none" aria-hidden="true" />
                    <input
                        type="search"
                        id="access-search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        aria-label={t('admin.access.search_ph')}
                        placeholder={t('admin.access.search_ph')}
                        className="w-full ps-9 pe-3 min-h-[44px] bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-[10px] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="v2-glass p-5 text-sm text-[var(--text-meta)]">{t('common.loading')}</div>
            ) : view.length === 0 ? (
                <div className="v2-glass p-5 flex items-start gap-3">
                    <Users size={18} className="text-[var(--text-meta)] shrink-0 mt-0.5" />
                    <p className="text-sm text-[var(--text-secondary)]">{t('admin.access.none')}</p>
                </div>
            ) : (
                <>
                    {/* Mobile : une carte par personne (pas de scroll horizontal). */}
                    <div className="md:hidden flex flex-col gap-2">
                        {view.map((r) => (
                            <div key={r.uid} className="v2-glass p-3.5 flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="font-semibold text-[var(--text-primary)] truncate">
                                            {r.name || t('admin.access.unknown_member')}
                                        </div>
                                        {r.governorId && (
                                            <div className="font-mono text-[11px] text-[var(--text-meta)]">{r.governorId}</div>
                                        )}
                                    </div>
                                    {roleCell(r)}
                                </div>
                                <div>{identity(r)}</div>
                                <div className="text-[11px] text-[var(--text-meta)]">
                                    {t('admin.access.col_synced')} — {fmtDate(r.updatedAt)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop : tableau, dans son propre conteneur de défilement. */}
                    <div className="hidden md:block v2-glass p-2 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.access.col_member')}</TableHead>
                                    <TableHead>{t('admin.access.col_role')}</TableHead>
                                    <TableHead>{t('admin.access.col_identity')}</TableHead>
                                    <TableHead>{t('admin.access.col_synced')}</TableHead>
                                    <TableHead>{t('admin.access.col_source')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {view.map((r) => (
                                    <TableRow key={r.uid}>
                                        <TableCell>
                                            <div className="font-semibold text-[var(--text-primary)]">
                                                {r.name || t('admin.access.unknown_member')}
                                            </div>
                                            {r.governorId && (
                                                <div className="font-mono text-[11px] text-[var(--text-meta)]">{r.governorId}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>{roleCell(r)}</TableCell>
                                        <TableCell>{identity(r)}</TableCell>
                                        <TableCell className="text-[var(--text-secondary)] whitespace-nowrap">{fmtDate(r.updatedAt)}</TableCell>
                                        <TableCell className="font-mono text-[11px] text-[var(--text-meta)]">{r.source || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            {/* Ce que le tableau ne dit PAS — cf. l'en-tête du fichier. */}
            {!loading && (
                <div className="v2-glass p-4 md:p-5 flex flex-col gap-2.5">
                    <h3 className="text-[13px] font-bold text-[var(--text-primary)]">{t('admin.access.limits_title')}</h3>
                    <ul className="flex flex-col gap-2 text-[13px] text-[var(--text-secondary)] list-disc ps-5">
                        <li>{t('admin.access.note_signin')}</li>
                        <li>{t('admin.access.note_sync')}</li>
                        <li>{t('admin.access.note_env')}</li>
                        <li>{t('admin.access.note_ladder')}</li>
                    </ul>
                    <p className="text-[12px] text-[var(--text-meta)]">
                        {t('admin.access.others_summary', { warriors: others.Warrior, guests: others.Guest })}
                    </p>
                </div>
            )}
        </div>
    );
};

export default AccessMatrix;
