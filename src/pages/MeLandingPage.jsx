import { useEffect, useState, useRef, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useData } from '../context/DataContext';
import { BRANDING } from '../config/branding';
import PageHeader from '../components/ui/PageHeader';
import { House } from '../components/ui/icons';
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
    const { rows: goalRows, revealed: goalRevealed, campaignName: goalCampaignName, primaryStats } = useMyKvkGoals();

    const [configLoading, setConfigLoading] = useState(true);
    const [kvkConfig, setKvkConfig] = useState(null);
    const [timeline, setTimeline] = useState([]);
    // Lot 3 : état de déclaration de TOUS les comptes réclamés (pas seulement le
    // principal). [{ governorId, name, type, isPrimary, declared, declaredAt, marchesCount }]
    const [myAccounts, setMyAccounts] = useState([]);
    const formRef = useRef(null);

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

                const cur = curSnap.exists() ? curSnap.data() : null;
                setKvkConfig(cur ? { id: cur.id, name: cur.name, status: cur.status || null } : null);

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

    const scrollToForm = useCallback(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    // Login-only (décision 2 / spec §3) : l'aiguillage de « / » envoie déjà un
    // visiteur vers /royaume ; ce garde couvre l'accès direct à /me par URL.
    if (!currentUser) return <Navigate to="/royaume" replace />;

    const kvkName = kvkConfig?.name || null;
    const isOff = !kvkConfig || kvkConfig.status === 'closed';
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
                                <NextActionCard accounts={myAccounts} kvkName={kvkName} onDeclareClick={scrollToForm} />
                                <CampaignTimelineBanner timeline={timeline} campaignName={kvkName} />
                            </div>
                            {/* Colonne droite : ce qu'on attend de moi et qui je suis */}
                            <div className="flex flex-col gap-4 min-w-0">
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
                        {/* Formulaire de déclaration complet, pleine largeur sous le
                            dashboard (contraint en lecture). Cible du CTA « Déclarer ». */}
                        <div ref={formRef} className="scroll-mt-20 w-full max-w-2xl mx-auto">
                            <AvailabilityForm />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MeLandingPage;
