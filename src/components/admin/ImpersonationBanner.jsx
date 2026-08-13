import { useTranslation } from 'react-i18next';
import { useRole, ROLES } from '../../context/RoleContext';
import { User, X } from '../ui/icons';

/**
 * F-033 « Voir en tant que » — bandeau global affiché tant qu'un aperçu de rôle
 * est actif. Permet de basculer de rôle et de revenir à sa vue. Gardé sur
 * `canImpersonate` (VRAI Roi) — jamais sur le rôle simulé, sinon un Roi en vue
 * « Guest » ne pourrait plus sortir. Rappelle que c'est un aperçu VISUEL (BR-021).
 */
const roleLabelKey = (r) => `view_as.role_${String(r).toLowerCase()}`;

const ImpersonationBanner = () => {
    const { t } = useTranslation();
    const { canImpersonate, isImpersonating, impersonatedRole, setImpersonatedRole } = useRole();

    if (!canImpersonate || !isImpersonating) return null;

    const switchable = [ROLES.WARRIOR, ROLES.OFFICER, ROLES.GUEST];

    return (
        <div className="sticky top-16 z-40 flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 bg-indigo-600/90 backdrop-blur-md border-b border-indigo-400/30 text-white">
            <User size={16} weight="fill" className="shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold">
                {t('view_as.banner', { role: t(roleLabelKey(impersonatedRole)) })}
            </span>
            <span className="hidden md:inline text-xs text-indigo-100/80">{t('view_as.banner_note')}</span>

            <div className="ms-auto flex items-center gap-1.5 flex-wrap">
                {switchable.map((r) => {
                    const active = impersonatedRole === r;
                    return (
                        <button
                            key={r}
                            type="button"
                            onClick={() => setImpersonatedRole(r)}
                            aria-pressed={active}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${active ? 'bg-white text-indigo-700' : 'bg-white/15 hover:bg-white/25 text-white'}`}
                        >
                            {t(roleLabelKey(r))}
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={() => setImpersonatedRole(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                    <X size={14} aria-hidden="true" />
                    {t('view_as.exit')}
                </button>
            </div>
        </div>
    );
};

export default ImpersonationBanner;
