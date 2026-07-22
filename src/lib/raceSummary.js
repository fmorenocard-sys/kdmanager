/**
 * raceSummary.js — F-020 : résumé de course figé à la clôture de campagne (F-015).
 *
 * Les agrégats `kvk_race/{cid}` vivent au rythme des scans et de la config : poids
 * DKP, exclusions et duel peuvent changer après coup, et un recompute réécrit tout.
 * L'archive `kvk_history`, elle, est immuable (rules : create par le Roi, update
 * limité au seul champ `outcome`). On y dépose donc une **copie autonome** du
 * résultat final de la course — pas une référence vers des documents mouvants.
 *
 * Ce qui est conservé est ce qui a du sens des mois plus tard : le duel final, le
 * classement des camps, notre place, et le haut du tableau des royaumes. Le détail
 * par gouverneur reste dans Storage, il n'a pas sa place dans une archive de saison.
 */

const TOP_KINGDOMS = 10;

/**
 * Construit le résumé archivable d'une campagne de course.
 * @param {object} campaign campagne issue de useRaceData (config + scans + kingdomsBySeq)
 * @returns {object|null} résumé autonome, ou null si la campagne n'a rien d'exploitable
 */
export function buildRaceSummary(campaign) {
    if (!campaign) return null;

    const scans = [...(campaign.scans || [])].sort((a, b) => a.seq - b.seq);
    const last = scans[scans.length - 1];
    if (!last) return null;

    const labels = campaign.labels || {};
    const roles = campaign.roles || {};
    const [duelA, duelB] = (campaign.hero_duel || [2, 3]).map(Number);
    const ourCamp = campaign.our_camp != null ? Number(campaign.our_camp) : null;
    const pinned = (campaign.pinned_kingdoms || []).map(Number);

    const kingdoms = [...(campaign.kingdomsBySeq?.[last.seq] || [])]
        .sort((a, b) => (b.dkp_net ?? 0) - (a.dkp_net ?? 0))
        .map((k, i) => ({ ...k, rank: i + 1 }));

    const duel = last.duel || null;
    // Le vainqueur du duel se lit sur le signe de l'écart, comme partout ailleurs.
    const winnerCamp = duel && duel.ecart != null
        ? (duel.ecart >= 0 ? duelA : duelB)
        : null;

    return {
        campaignId: campaign.id,
        campaignName: campaign.name || campaign.id,
        scanCount: scans.length,
        finalSeq: last.seq,
        finalScanAt: last.meta?.scanTs || null,

        duel: duel ? {
            camp_a: duel.camp_a ?? null,
            camp_b: duel.camp_b ?? null,
            ecart: duel.ecart ?? null,
            label_a: labels[duelA] || `Camp ${duelA}`,
            label_b: labels[duelB] || `Camp ${duelB}`,
            winner_camp: winnerCamp,
            winner_label: winnerCamp != null ? (labels[winnerCamp] || `Camp ${winnerCamp}`) : null,
            we_won: winnerCamp != null && ourCamp != null ? winnerCamp === ourCamp : null
        } : null,

        camps: (last.camps || []).map((c) => ({
            camp: c.camp,
            label: labels[c.camp] || `Camp ${c.camp}`,
            role: roles[c.camp] || null,
            dkp_net: c.dkp_net ?? null,
            coverage: c.coverage ?? null
        })).sort((a, b) => (b.dkp_net ?? 0) - (a.dkp_net ?? 0)),

        // Nos royaumes épinglés, avec leur rang final : c'est la ligne qu'on
        // relira dans deux saisons pour situer la performance de 2997.
        ours: kingdoms
            .filter((k) => pinned.includes(Number(k.kingdom)))
            .map((k) => ({
                kingdom: k.kingdom,
                rank: k.rank,
                dkp_net: k.dkp_net ?? null,
                coverage: k.coverage ?? null,
                dkp_per_mpower: k.dkp_per_mpower ?? null
            })),

        topKingdoms: kingdoms.slice(0, TOP_KINGDOMS).map((k) => ({
            rank: k.rank,
            kingdom: k.kingdom,
            camp: k.camp,
            dkp_net: k.dkp_net ?? null
        })),

        kingdomCount: kingdoms.length,
        // Les poids DKP figés avec le résultat : sans eux, les chiffres archivés ne
        // sont plus interprétables si le barème change à la saison suivante (BR-010).
        dkpWeights: campaign.dkp || null,
        exclusionsApplied: campaign.exclusionsApplied ?? null,
        summarizedAt: new Date().toISOString()
    };
}
