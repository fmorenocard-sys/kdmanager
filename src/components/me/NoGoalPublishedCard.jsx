import { useTranslation } from 'react-i18next';
import { Target } from '../ui/icons';

/**
 * F-032 — État « objectifs pas encore publiés » de l'espace « Moi » (spec §6.2).
 * Contour pointillé, PAS une barre à 0 % (qui se lirait comme un échec). Le
 * composant existe dès le Lot 1 ; son câblage définitif (fallback quand
 * useMyKvkGoals ne retourne pas d'objectif) arrive au Lot 2 avec MyGoalCard.
 */
const NoGoalPublishedCard = () => {
    const { t } = useTranslation();
    return (
        <div className="rounded-xl p-4 md:p-5 border border-dashed border-white/15 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
                <Target size={15} className="text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    {t('me.nogoal.badge')}
                </span>
            </div>
            <p className="text-base font-bold text-white leading-snug text-pretty">{t('me.nogoal.title')}</p>
            <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{t('me.nogoal.desc')}</p>
        </div>
    );
};

export default NoGoalPublishedCard;
