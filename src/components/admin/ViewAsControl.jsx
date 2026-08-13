import { useTranslation } from 'react-i18next';
import { useRole, ROLES } from '../../context/RoleContext';
import { User, AlertTriangle } from '../ui/icons';

/**
 * F-033 « Voir en tant que » — point d'entrée dans l'Administration (Roi-only).
 * Lance un aperçu du gating UI d'un autre rôle. Une fois actif, le bandeau global
 * (ImpersonationBanner) prend le relais pour basculer/sortir — cette page devient
 * d'ailleurs inaccessible dès qu'on n'est plus « Roi effectif ».
 *
 * CAVEAT AFFICHÉ (BR-021) : aperçu VISUEL uniquement — ne teste PAS les
 * restrictions de données (les règles Firestore appliquent toujours le vrai rôle).
 */
const ViewAsControl = () => {
    const { t } = useTranslation();
    const { canImpersonate, impersonatedRole, setImpersonatedRole } = useRole();

    if (!canImpersonate) return null;

    const roles = [ROLES.GUEST, ROLES.WARRIOR, ROLES.OFFICER];

    return (
        <div className="v2-glass p-4 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <User size={18} weight="duotone" className="text-indigo-400 shrink-0" aria-hidden="true" />
                <p className="text-sm text-[var(--text-secondary)]">{t('view_as.desc')}</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {roles.map((r) => {
                    const active = impersonatedRole === r;
                    return (
                        <button
                            key={r}
                            type="button"
                            onClick={() => setImpersonatedRole(r)}
                            aria-pressed={active}
                            className={`min-h-11 px-4 rounded-lg text-sm font-bold border transition-colors ${active
                                ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40'
                                : 'bg-[var(--border-flat)] text-slate-300 border-[var(--border-flat)] hover:border-slate-500 hover:text-white'}`}
                        >
                            {t(`view_as.role_${r.toLowerCase()}`)}
                        </button>
                    );
                })}
            </div>

            <p className="text-xs text-amber-300/90 flex items-start gap-1.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{t('view_as.caveat')}</span>
            </p>
        </div>
    );
};

export default ViewAsControl;
