import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from '../ui/icons';

/**
 * F-032 — État « erreur de scan » de l'espace « Moi » (spec §6.2). Un chiffre
 * périmé vaut mieux qu'une page vide : on affiche la bannière rouge + la date du
 * dernier scan réussi + un bouton Réessayer, mais on laisse le reste de la page
 * s'afficher (grisé côté objectif au Lot 2). Bannière non bloquante.
 */
const ErrorCard = ({ lastScan, onRetry }) => {
    const { t, i18n } = useTranslation();
    const when = lastScan
        ? new Intl.DateTimeFormat(i18n.language, {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
          }).format(lastScan)
        : null;

    return (
        <div className="rounded-xl p-4 md:p-5 bg-red-500/[0.06] border border-red-500/30 flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
                <AlertTriangle size={15} weight="fill" className="text-red-400 shrink-0" aria-hidden="true" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-red-400">
                    {t('me.error.badge')}
                </span>
            </div>
            <div>
                <p className="text-base font-bold text-white leading-snug text-pretty">{t('me.error.title')}</p>
                {when && (
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1.5">
                        {t('me.error.last_scan')} <span className="font-mono text-slate-300">{when} UTC</span>
                    </p>
                )}
            </div>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="min-h-11 rounded-lg border border-white/15 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
                >
                    <RefreshCw size={16} aria-hidden="true" />
                    {t('me.error.retry')}
                </button>
            )}
        </div>
    );
};

export default ErrorCard;
