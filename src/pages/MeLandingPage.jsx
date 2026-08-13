import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useRole, ROLES } from '../context/RoleContext';
import { useData } from '../context/DataContext';
import { BRANDING } from '../config/branding';
import PageHeader from '../components/ui/PageHeader';
import { House, History, Sword, ChevronDown, ChevronUp } from '../components/ui/icons';
import AvailabilityForm from '../components/war/AvailabilityForm';
import CampaignTimelineBanner from '../components/war/CampaignTimelineBanner';
import NextActionCard from '../components/me/NextActionCard';
import LoadingSkeleton from '../components/me/LoadingSkeleton';
import ErrorCard from '../components/me/ErrorCard';
import OffCampaignCard from '../components/me/OffCampaignCard';
import MyGoalCard from '../components/me/MyGoalCard';
import NoGoalPublishedCard from '../components/me/NoGoalPublishedCard';
import MyStatsCard from '../components/me/MyStatsCard';
import MyAccountsSummary from '../components/me/MyAccountsSummary';
import { useMyKvkGoals } from '../hooks/useMyKvkGoals';

/**
 * F-032 — Espace perso « Moi » (spec docs/pm/Spec_Espace_Perso.md).
 * Landing action-first, universelle (Warrior/Officer/King, décision 2 du Roi) :
 * une prochaine action en tête, puis le calendrier de campagne et le formulaire
 * de déclaration. Cette page est une COUCHE DE LECTURE/ORCHESTRATION — aucune
 * écriture Firestore ici (AvailabilityForm gère toutes les écritures).
 *
 * Lot 1 (socle) : aiguillage + états page-entière (Loading / Erreur /
 * Hors-campagne) + composition AvailabilityForm & CampaignTimelineBanner +
 * NextActionCard sur le compte PRINCIPAL. Les lots suivants ajoutent l'objectif
 * perso (Lot 2), le multi-compte (Lot 3) et Mes stats web (Lot 4).
 */
const MeLandingPage = () => {
    const { t } = useTranslation();
    const { currentUser, governorId, accounts } = useAuth();
    const { role } = useRole();
    const { error: dataError, lastUpdated } = useData();

    const [configLoading, setConfigLoading] = useState(true);
    const [kvkConfig, setKvkConfig] = useState(null);
    const [timeline, setTimeline] = useState([]);
    // Lot 3 : état de déclaration de TOUS les comptes réclamés (pas seulement le
    // principal). [{ governorId, name, type, isPrimary, declared, declaredAt, marchesCount }]
    const [myAccounts, setMyAccounts] = useState([]);
    // DA : le formulaire de déclaration (volumineux) est REPLIÉ par défaut — /me
    // reste un dashboard action-first (mock), la déclaration est à un clic.
    const [formOpen, setFormOpen] = useState(false);
    const formRef = useRef(null);

    // Stacks filler déclarés, dérivés des war_availabilities DÉJÀ lues pour composer
    // la page — évite au hook objectif de relire les mêmes docs (une seule lecture
    // Firestore par montage de /me).
    const fillerDecls = useMemo(() => {
        const m = {};
        myAccounts.forEach((a) => {
            if (a.type === 'filler' && a.declared) m[a.governorId] = { t4: a.fillerT4 || 0, t5: a.fillerT5 || 0 };
        });
        return m;
    }, [myAccounts]);

    // Objectif & stats KvK : le hook réutilise le `config` et les `fillerDecls`
    // déjà chargés ici (pas de double lecture kvk_config/war_availabilities).
    const {
        rows: goalRows, revealed: goalRevealed, campaignName: goalCampaignName, primaryStats,
        campaigns, selectedKey, selectCampaign,
    } = useMyKvkGoals({ config: kvkConfig, fillerDecls });

    useEffect(() => {
        let alive = true;
        const load = async () => {
            // Login-only : un visiteur est redirigé vers /royaume au rendu. On
            // évite ici les lectures Firestore futiles (kvk_config n'est pas public
            // → permission-denied) tant qu'il n'y a pas d'utilisateur connecté.
            if (!currentUser) { setConfigLoading(false); return; }
            setConfigLoading(true);
            try {
                // Lecture de référence copiée de KvkGoalsPanel : current + timeline
                // en parallèle (aucune abstraction commune à importer).
                const [curSnap, tlSnap] = await Promise.all([
                    getDoc(doc(db, 'kvk_config', 'current')),
                    getDoc(doc(db, 'kvk_config', 'timeline')),
                ]);
                if (!alive) return;

                // Config COMPLÈTE (le hook objectif y lit fillerDeathRatio,
                // revealGoalStatus, startDate — plus de relecture de kvk_config).
                const cur = curSnap.exists() ? curSnap.data() : null;
                setKvkConfig(cur);

                // Garde anti-frise-périmée : n'afficher les jalons que s'ils sont
                // estampillés pour la campagne courante (ou non estampillés).
                if (tlSnap.exists()) {
                    const tl = tlSnap.data();
                    setTimeline(!tl.campaignId || tl.campaignId === cur?.id ? (tl.events || []) : []);
                } else {
                    setTimeline([]);
                }

                // État de déclaration de TOUS les comptes réclamés pour la campagne
                // courante (docId 3 segments, repli 2 segments pour le principal,
                // comme AvailabilityForm). Lecture bornée au nombre de comptes.
                if (currentUser && cur) {
                    const kvkId = cur.id || 'default_kvk';
                    const acctList = (accounts && accounts.length)
                        ? accounts
                        : (governorId ? [{ governorId, type: 'war' }] : []);
                    const built = await Promise.all(acctList.map(async (a) => {
                        const gid = String(a.governorId);
                        let sn = await getDoc(doc(db, 'war_availabilities', `${kvkId}_${currentUser.uid}_${gid}`));
                        if (!sn.exists() && gid === String(governorId || '')) {
                            sn = await getDoc(doc(db, 'war_availabilities', `${kvkId}_${currentUser.uid}`));
                        }
                        const d = sn.exists() ? sn.data() : null;
                        return {
                            governorId: gid,
                            name: a.name || gid,
                            type: a.type || 'war',
                            isPrimary: gid === String(governorId || ''),
                            declared: !!d,
                            declaredAt: d?.updatedAt?.toDate ? d.updatedAt.toDate() : null,
                            marchesCount: d && Array.isArray(d.marches) ? d.marches.length : null,
                            // Stacks filler déclarés (pour l'affichage enrichi des comptes déclarés)
                            fillerT4: d?.filler?.t4 ?? null,
                            fillerT5: d?.filler?.t5 ?? null,
                        };
                    }));
                    if (!alive) return;
                    setMyAccounts(built);
                } else {
                    setMyAccounts([]);
                }
            } catch (e) {
                console.error('[MeLandingPage] échec lecture config/déclaration', e);
            } finally {
                if (alive) setConfigLoading(false);
            }
        };
        load();
        return () => { alive = false; };
    }, [currentUser, governorId, accounts]);

    const openForm = useCallback(() => {
        setFormOpen(true);
        requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }, []);

    // Login-only (décision 2 / spec §3) : un visiteur — ou un aperçu « en tant que
    // Guest » (F-033) — est renvoyé sur la vitrine du royaume. Couvre aussi l'accès
    // direct à /me par URL.
    if (!currentUser || role === ROLES.GUEST) return <Navigate to="/royaume" replace />;

    const kvkName = kvkConfig?.name || null;
    const isOff = !kvkConfig || kvkConfig.status === 'closed';
    // Prochain jalon (pour le compte à rebours de la carte « prochaine action »).
    const nextMilestone = (() => {
        const now = Date.now();
        const up = (timeline || [])
            .map((e) => ({ label: e.label, ts: Date.parse(e.at) }))
            .filter((e) => e.label && Number.isFinite(e.ts) && e.ts > now)
            .sort((a, b) => a.ts - b.ts);
        return up[0] || null;
    })();
    // Rollup « X/Y déclarés » dans le sous-titre du header (mock desktop), plutôt
    // qu'une barre séparée. Seulement en campagne active et multi-compte.
    const declaredCount = myAccounts.filter((a) => a.declared).length;
    const subtitleParts = [currentUser.displayName, role, BRANDING.kingdomName];
    if (!configLoading && !isOff && myAccounts.length > 1) {
        subtitleParts.push(t('me.rollup', { done: declaredCount, total: myAccounts.length }));
    }
    const subtitle = subtitleParts.filter(Boolean).join(' · ');

    const goalPublished = goalRows.some((r) => r.published);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader icon={House} title={t('nav.me')} subtitle={subtitle} />

            {/* Étroit en mobile/tablette (colonne unique), élargi en desktop pour
                les 2 colonnes (spec §6.3). */}
            <div className="mx-auto w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4">
                {dataError && (
                    <ErrorCard lastScan={lastUpdated || null} onRetry={() => window.location.reload()} />
                )}

                {configLoading ? (
                    <LoadingSkeleton />
                ) : isOff ? (
                    <div className="flex flex-col gap-4">
                        <OffCampaignCard kvkName={kvkName} />
                        <MyAccountsSummary />
                    </div>
                ) : (
                    <>
                        {/* Dashboard 2 colonnes en desktop (spec §6.3 / mock « desktop 1a ») :
                            gauche = action + calendrier ; droite = objectif + (Mes stats, Lot 4)
                            + comptes. Même ordre DOM qu'en mobile — la grille ne fait que
                            refluer (mock : « the grid only reflows it »). */}
                        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4 lg:gap-6 items-start">
                            {/* Colonne gauche : quoi faire et quand */}
                            <div className="flex flex-col gap-4 min-w-0">
                                <NextActionCard accounts={myAccounts} kvkName={kvkName} nextMilestone={nextMilestone} onDeclareClick={openForm} />
                                <CampaignTimelineBanner timeline={timeline} campaignName={kvkName} />
                            </div>
                            {/* Colonne droite : ce qu'on attend de moi et qui je suis */}
                            <div className="flex flex-col gap-4 min-w-0">
                                {/* Sélecteur de campagne (F-032) : campagne courante + campagnes
                                    passées (kvk_history). Pilote l'objectif + Mes stats. */}
                                {campaigns.length > 1 && (
                                    <div className="relative w-full">
                                        <History size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" aria-hidden="true" />
                                        <select
                                            aria-label={t('me.campaign.label')}
                                            value={selectedKey}
                                            onChange={(e) => selectCampaign(e.target.value)}
                                            className="w-full ps-9 pe-3 py-2 min-h-[40px] bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-lg text-sm text-slate-200"
                                        >
                                            {campaigns.map((c) => (
                                                <option key={c.key} value={c.key}>
                                                    {c.isCurrent
                                                        ? (c.name ? t('me.campaign.current_named', { name: c.name }) : t('me.campaign.current'))
                                                        : c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {goalPublished ? (
                                    <>
                                        <MyGoalCard rows={goalRows} primaryId={governorId} revealed={goalRevealed} campaignName={goalCampaignName || kvkName} />
                                        <MyStatsCard stats={primaryStats} />
                                    </>
                                ) : (
                                    <NoGoalPublishedCard campaignName={goalCampaignName || kvkName} />
                                )}
                                <MyAccountsSummary />
                            </div>
                        </div>
                        {/* Formulaire de déclaration — REPLIÉ par défaut (DA) : /me reste
                            un dashboard, la déclaration est à un clic (CTA de la carte
                            action ou cette barre). */}
                        <div ref={formRef} className="scroll-mt-20 w-full max-w-2xl mx-auto">
                            {formOpen ? (
                                <div className="flex flex-col gap-2">
                                    <button type="button" onClick={() => setFormOpen(false)}
                                        className="self-end inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-white transition-colors">
                                        {t('me.declare.collapse')} <ChevronUp size={14} aria-hidden="true" />
                                    </button>
                                    <AvailabilityForm />
                                </div>
                            ) : (
                                <button type="button" onClick={openForm}
                                    className="v2-glass w-full p-4 flex items-center gap-3 text-start transition-all hover:brightness-110">
                                    <Sword size={18} weight="fill" className="text-amber-400 shrink-0" aria-hidden="true" />
                                    <span className="flex-1 text-sm font-bold text-white">
                                        {myAccounts.some((a) => !a.declared) ? t('me.next_action.cta') : t('me.declare.edit')}
                                    </span>
                                    <ChevronDown size={18} className="text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MeLandingPage;
