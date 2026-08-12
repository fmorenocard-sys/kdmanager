import { useTranslation } from 'react-i18next';
import { AlertCircle, Sword, CheckCircle } from '../ui/icons';

/**
 * F-032 — Carte « prochaine action », cœur de la hiérarchie action-first de
 * l'espace perso « Moi » (spec §5.3 / §6.1). Deux formes selon l'état du COMPTE
 * PRINCIPAL de l'utilisateur pour la campagne courante :
 *  - non déclaré → carte ambre soutenue (v2-amber) + CTA de déclaration ;
 *  - déclaré → reçu vert compact + bouton Modifier.
 * Le multi-compte (rollup, cartes par compte en attente) arrive au Lot 3 —
 * ici on ne statue que sur le compte principal. Le formulaire complet
 * (AvailabilityForm) vit sous cette carte et gère tous les comptes ;
 * onDeclareClick n'est qu'un raccourci vers ce formulaire.
 */
const NextActionCard = ({ declared, kvkName, declaredAt, marchesCount, onDeclareClick }) => {
    const { t, i18n } = useTranslation();

    if (declared) {
        const when = declaredAt
            ? new Intl.DateTimeFormat(i18n.language, {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
              }).format(declaredAt)
            : null;
        return (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30">
                <CheckCircle size={22} weight="fill" className="text-emerald-400 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{t('me.next_action.declared_title')}</p>
                    {(when || marchesCount != null) && (
                        <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                            {[when, marchesCount != null ? t('me.next_action.marches', { count: marchesCount }) : null]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onDeclareClick}
                    className="min-h-9 px-3 rounded-lg border border-white/15 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/5 hover:text-white transition-colors shrink-0"
                >
                    {t('me.next_action.edit')}
                </button>
            </div>
        );
    }

    return (
        <div className="v2-glass v2-amber p-4 md:p-5 flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
                <AlertCircle size={15} weight="fill" className="text-amber-400 shrink-0" aria-hidden="true" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">
                    {t('me.next_action.badge')}
                </span>
            </div>
            <div>
                <p className="text-lg font-bold text-white leading-snug text-pretty">
                    {t('me.next_action.not_declared_title', { name: kvkName })}
                </p>
                <p className="text-[13px] leading-relaxed text-[var(--text-secondary)] mt-1.5">
                    {t('me.next_action.not_declared_desc')}
                </p>
            </div>
            <button
                type="button"
                onClick={onDeclareClick}
                className="btn-grad-primary min-h-12 rounded-lg text-white text-[15px] font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110"
            >
                <Sword size={18} weight="fill" aria-hidden="true" />
                {t('me.next_action.cta')}
            </button>
        </div>
    );
};

export default NextActionCard;
