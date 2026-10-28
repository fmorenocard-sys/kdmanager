import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useRole, ROLES } from '../context/RoleContext';
import { useData } from '../context/DataContext';
import { useMentoringSheet } from '../hooks/useMentoringSheet';
import SheetForm from '../components/mentoring/SheetForm';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { ScrollText, Users } from '../components/ui/icons';

/**
 * MentoringSheetPage — E-010 / F-039, route `/fiche`.
 *
 * Deux entrées pour le MÊME formulaire :
 *  - le joueur remplit la fiche du compte principal qu'il a réclamé ;
 *  - le leadership (mentor / Conseil) la remplit **au nom d'un autre compte**.
 *
 * Cette seconde entrée est le levier du MVP : mesuré le 2026-10-21, **23 des 41
 * comptes principaux de 2997 n'ont aucun utilisateur**. Sans elle, le critère
 * « 100 % des comptes ont une fiche » est mathématiquement inatteignable, quelle
 * que soit la qualité du formulaire.
 *
 * Le compte édité vit dans l'URL (`?gov=`), comme les onglets du hub KvK : un
 * mentor peut garder un onglet par mentoré, et l'actualisation ne perd rien.
 */
const MentoringSheetPage = () => {
    const { t } = useTranslation();
    const { currentUser, accounts, governorId, loading: authLoading } = useAuth();
    const { isAuthorized } = useRole();
    const { players } = useData();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [scope, setScope] = useState([]);

    const isLeadership = isAuthorized([ROLES.KING, ROLES.OFFICER]);

    // Les comptes PRINCIPAUX de l'utilisateur (les fillers sont hors périmètre).
    const myWarAccounts = useMemo(
        () => (accounts || []).filter((a) => a.type !== 'filler'),
        [accounts]
    );

    // Périmètre du programme — copie figée de la liste de suivi du Roi (BR-031),
    // jamais une lecture directe de `static_data/kvk` qui change à chaque KvK.
    useEffect(() => {
        let alive = true;
        if (!isLeadership) return () => {};
        getDoc(doc(db, 'mentoring_program', 'main'))
            .then((s) => { if (alive && s.exists()) setScope((s.data().scopeGovernorIds || []).map(String)); })
            .catch((err) => console.warn('[fiche] périmètre illisible', err));
        return () => { alive = false; };
    }, [isLeadership]);

    const requested = params.get('gov');
    const target = requested || governorId || myWarAccounts[0]?.governorId || null;
    const onBehalf = !!target && !myWarAccounts.some((a) => String(a.governorId) === String(target));

    // Peut-il RÉELLEMENT enregistrer ? Même condition que la règle Firestore
    // (BR-027) : le leadership, ou celui qui a réclamé ce gouverneur.
    //
    // Sans ce garde-fou, le formulaire s'ouvrait pour tout le monde et ne se
    // plaignait qu'au moment d'écrire, par un « Enregistrement impossible » en
    // bas de page. Un joueur a ainsi rempli ses 23 champs avant de l'apprendre
    // (2026-10-27) : il avait suivi un lien `?gov=` — précisément celui que
    // produit le bouton « Ouvrir » du suivi du Conseil, qu'un mentor lui avait
    // transmis. Le lien est utile, il ne doit juste pas promettre une écriture
    // que les règles refuseront.
    const canWrite = isLeadership
        || myWarAccounts.some((a) => String(a.governorId) === String(target));

    const sheet = useMentoringSheet(target);

    // « Terminer » doit CHANGER QUELQUE CHOSE. Il appelait `flush()`, qui ne fait
    // rien quand tout est déjà enregistré — c'est-à-dire presque toujours, la
    // fiche s'autosauvegardant 1,5 s après la frappe. Une joueuse a cliqué
    // quatre fois puis rechargé la page avant de demander sur Discord si elle
    // aurait dû recevoir une confirmation (2026-10-28). Elle avait raison : un
    // bouton ambre, portant une icône de disquette et le mot « Terminer »,
    // promet une fin d'action ; il doit en produire une.
    //
    // On enregistre, on vérifie que c'est bien parti, PUIS on quitte l'écran :
    // le changement de page EST la confirmation, et la destination affiche
    // l'état réel de la fiche (« Complète. Merci ! » sur /me). En cas d'échec on
    // reste, et le message d'erreur sous les boutons garde la main.
    // « Terminer » : on enregistre, on CONFIRME, et on part — les trois d'un
    // seul geste. Deux versions ont précédé celle-ci :
    //   1. naviguer sans rien dire, en pariant que le changement de page valait
    //      confirmation. Trop ambigu : rien n'y distingue une réussite d'un
    //      abandon, et sur un téléphone lent ça passe inaperçu.
    //   2. un écran de confirmation pleine page. Explicite, mais une page
    //      entière pour quatre mots et aucune décision à prendre — et une
    //      CINQUIÈME façon de dire « c'est fait » dans une app qui en avait
    //      déjà quatre (`designer.md` §2.4).
    // Le toast tient les deux bouts : il se voit, il ne coûte pas un écran, et
    // il survit à la navigation puisqu'il est monté au-dessus des routes.
    const handleDone = async () => {
        const ok = await sheet.flush();
        // En cas d'échec on NE navigue pas et on ne « toaste » pas : le message
        // d'erreur sous les boutons reste à l'écran, là où on peut le relire.
        if (!ok) return;
        toast(t('mentoring.saved_title'));
        navigate(isLeadership && onBehalf ? '/pilotage?tab=mentoring' : '/me');
    };

    const nameOf = (gid) => (players || []).find((p) => String(p.id) === String(gid))?.name || gid;

    // ⚠️ Attendre que l'authentification ait fini de charger AVANT de conclure
    // quoi que ce soit. `onAuthStateChanged` pose `currentUser` puis va lire le
    // profil : entre les deux, `accounts` est encore vide. Sans cette garde, un
    // joueur parfaitement en règle verrait « réclame ton compte » le temps d'un
    // aller-retour Firestore — et refuserait de croire le message suivant.
    if (authLoading) {
        return <div className="p-8 text-center text-[var(--text-meta)]">{t('common.loading')}</div>;
    }

    if (!currentUser) {
        return <EmptyState icon={ScrollText} title={t('mentoring.login_required')} />;
    }

    // Aucun compte visé, ou un compte que cet utilisateur ne pourra pas écrire :
    // même écran, même message — « réclame ton compte principal d'abord ». Dire
    // non AVANT la saisie plutôt qu'après.
    if (!target || !canWrite) {
        return (
            <div className="space-y-6">
                <PageHeader icon={ScrollText} title={t('mentoring.title')} subtitle={t('mentoring.subtitle')} />
                <EmptyState icon={Users} title={t('mentoring.no_account_claimed')} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader icon={ScrollText} title={t('mentoring.title')} subtitle={t('mentoring.subtitle')} />

            {/* Sélecteur de compte : les siens, et pour le leadership tout le périmètre */}
            {(myWarAccounts.length > 1 || isLeadership) && (
                <section className="v2-glass p-4 md:p-5">
                    <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor="gov-select">
                        {isLeadership ? t('mentoring.fill_for') : t('mentoring.which_account')}
                    </label>
                    <select
                        id="gov-select"
                        value={String(target)}
                        onChange={(e) => setParams({ gov: e.target.value }, { replace: true })}
                        className="w-full md:w-auto md:min-w-[320px] max-w-full min-w-0 min-h-[44px] px-3.5 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-[10px] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                        <optgroup label={t('mentoring.my_accounts')}>
                            {myWarAccounts.map((a) => (
                                <option key={a.governorId} value={a.governorId}>
                                    {a.name || nameOf(a.governorId)} ({a.governorId})
                                </option>
                            ))}
                        </optgroup>
                        {isLeadership && scope.length > 0 && (
                            <optgroup label={t('mentoring.program_scope')}>
                                {scope
                                    .filter((gid) => !myWarAccounts.some((a) => String(a.governorId) === gid))
                                    .map((gid) => (
                                        <option key={gid} value={gid}>{nameOf(gid)} ({gid})</option>
                                    ))}
                            </optgroup>
                        )}
                    </select>

                    {/* Dire explicitement qu'on saisit pour autrui : sans ce repère, un
                        mentor peut croire modifier sa propre fiche. */}
                    {onBehalf && (
                        <p className="text-xs text-amber-400 mt-2.5" role="status">
                            {t('mentoring.on_behalf_notice', { name: nameOf(target) })}
                        </p>
                    )}
                </section>
            )}

            {sheet.loading ? (
                <div className="p-8 text-center text-muted">{t('common.loading')}</div>
            ) : (
                <SheetForm
                    blocks={sheet.blocks}
                    setField={sheet.setField}
                    progress={sheet.progress}
                    saving={sheet.saving}
                    error={sheet.error}
                    meta={sheet.meta}
                    onDone={handleDone}
                />
            )}
        </div>
    );
};

export default MentoringSheetPage;
