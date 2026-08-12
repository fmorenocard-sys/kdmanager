import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, ChevronRight } from '../ui/icons';

/**
 * F-032 / Lot 3 — résumé condensé « Mes comptes » de l'espace perso (spec §5.3).
 * Liste les comptes réclamés (nom + badges type/principal) avec un lien « Gérer »
 * vers /profile. PAS une réplique du flux claim/type/principal complet de
 * ProfilePage — juste un aperçu + point d'entrée vers la gestion.
 */
const MyAccountsSummary = () => {
    const { t } = useTranslation();
    const { accounts, governorId } = useAuth();
    const list = accounts || [];

    return (
        <div className="v2-glass p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Users size={15} className="text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        {t('me.accounts.title')}
                    </span>
                </div>
                <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors">
                    {t('me.accounts.manage')}
                    <ChevronRight size={14} aria-hidden="true" />
                </Link>
            </div>

            {list.length === 0 ? (
                <p className="text-[13px] text-[var(--text-secondary)]">{t('me.accounts.none')}</p>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {list.map((a) => {
                        const gid = String(a.governorId);
                        const isPrimary = gid === String(governorId || '');
                        return (
                            <div key={gid} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/5 min-h-11">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-white truncate">{a.name || gid}</p>
                                    <p className="text-[10px] text-[var(--text-secondary)] font-mono">{gid}</p>
                                </div>
                                {isPrimary && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                                        {t('me.account.primary')}
                                    </span>
                                )}
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/5 text-[var(--text-secondary)] border border-white/10 shrink-0">
                                    {t(a.type === 'filler' ? 'me.account.filler' : 'me.account.war')}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyAccountsSummary;
