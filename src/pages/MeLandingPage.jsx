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
    const { rows: goalRows, revealed: goalRevealed } = useMyKvkGoals();

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
    const subtitle = [currentUser.displayName, role, BRANDING.kingdomName].filter(Boolean).join(' · ');

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader icon={House} title={t('nav.me')} subtitle={subtitle} />

            <div className="max-w-2xl mx-auto w-full flex flex-col gap-3.5">
                {dataError && (
                    <ErrorCard lastScan={lastUpdated || null} onRetry={() => window.location.reload()} />
                )}

                {configLoading ? (
                    <LoadingSkeleton />
                ) : isOff ? (
                    <OffCampaignCard kvkName={kvkName} />
                ) : (
                    <>
                        <NextActionCard
                            accounts={myAccounts}
                            kvkName={kvkName}
                            onDeclareClick={scrollToForm}
                        />
                        <CampaignTimelineBanner timeline={timeline} campaignName={kvkName} />
                        {/* Lot 2 — objectif perso : carte si un objectif est publié
                            (war = initialPower figé, filler = stacks déclarés), sinon
                            le placeholder « pas encore publié » (spec §5.2 / §6.2). */}
                        {goalRows.some((r) => r.published) ? (
                            <MyGoalCard rows={goalRows} primaryId={governorId} revealed={goalRevealed} />
                        ) : (
                            <NoGoalPublishedCard />
                        )}
                        <div ref={formRef} className="scroll-mt-20">
                            <AvailabilityForm />
                        </div>
                    </>
                )}

                {/* Lot 3 — résumé « Mes comptes » (roster + lien Gérer). Toujours
                    utile, en/hors campagne ; masqué seulement pendant le chargement. */}
                {!configLoading && <MyAccountsSummary />}
            </div>
        </div>
    );
};

export default MeLandingPage;
