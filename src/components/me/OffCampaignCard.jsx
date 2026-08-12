import { useTranslation } from 'react-i18next';
import { Flag, Calendar } from '../ui/icons';

/**
 * F-032 — État « hors-campagne » de l'espace « Moi » (spec §6.2). Déclenché par
 * kvk_config/current.status === 'closed' (BR-013) ou l'absence de campagne. Rien
 * à déclarer : on l'annonce et on pointe vers l'annonce de la prochaine campagne.
 * La carte « résultat final » (rating BR-019 visible une fois la saison close)
 * dépend de la logique d'objectif — ajoutée au Lot 2, pas ici.
 */
const OffCampaignCard = ({ kvkName }) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-3.5">
            <div className="v2-glass v2-indigo p-4 md:p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Flag size={15} className="text-indigo-300 shrink-0" aria-hidden="true" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-300">
                        {t('me.offcampaign.badge')}
                    </span>
                </div>
                <p className="text-lg font-bold text-white leading-snug text-pretty">
                    {kvkName
                        ? t('me.offcampaign.title', { name: kvkName })
                        : t('me.offcampaign.title_generic')}
                </p>
                <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    {t('me.offcampaign.desc')}
                </p>
            </div>

            <div className="v2-glass p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        {t('me.offcampaign.next_badge')}
                    </span>
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {t('me.offcampaign.next_none')}
                </p>
            </div>
        </div>
    );
};

export default OffCampaignCard;
