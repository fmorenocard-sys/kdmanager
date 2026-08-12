import { useTranslation } from 'react-i18next';
import { AlertCircle, Sword, CheckCircle } from '../ui/icons';

/**
 * F-032 — Carte « prochaine action », cœur de la hiérarchie action-first de
 * l'espace perso « Moi » (spec §5.3 / §6.1).
 *
 * Lot 1 : compte unique (ambre à déclarer / reçu vert déclaré).
 * Lot 3 : multi-compte — rollup « X/Y déclarés » + barre, liste des comptes en
 * attente (ambre, une ligne par compte) et déclarés (vert). Le CTA renvoie au
 * formulaire complet (AvailabilityForm) qui gère la déclaration réelle par compte.
 *
 * @param {Array<{governorId,name,type,isPrimary,declared,declaredAt,marchesCount}>} accounts
 */
const TypeBadge = ({ type, isPrimary, t }) => (
    <span className="inline-flex items-center gap-1 shrink-0">
        {isPrimary && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {t('me.account.primary')}
            </span>
        )}
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/5 text-[var(--text-secondary)] border border-white/10">
            {t(type === 'filler' ? 'me.account.filler' : 'me.account.war')}
        </span>
    </span>
);

const NextActionCard = ({ accounts = [], kvkName, onDeclareClick }) => {
    const { t, i18n } = useTranslation();

    const fmtDate = (d) => d
        ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(d)
        : null;

    // ── Compte unique (ou aucun compte réclamé) : forme d'origine ──────────────
    if (accounts.length <= 1) {
        const a = accounts[0];
        if (a?.declared) {
            const when = fmtDate(a.declaredAt);
            return (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30">
                    <CheckCircle size={22} weight="fill" className="text-emerald-400 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{t('me.next_action.declared_title')}</p>
                        {(when || a.marchesCount != null) && (
                            <p className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">
                                {[when, a.marchesCount != null ? t('me.next_action.marches', { count: a.marchesCount }) : null].filter(Boolean).join(' · ')}
                            </p>
                        )}
                    </div>
                    <button type="button" onClick={onDeclareClick}
                        className="min-h-9 px-3 rounded-lg border border-white/15 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/5 hover:text-white transition-colors shrink-0">
                        {t('me.next_action.edit')}
                    </button>
                </div>
            );
        }
        return (
            <div className="v2-glass v2-amber p-4 md:p-5 flex flex-col gap-3.5">
                <div className="flex items-center gap-2">
                    <AlertCircle size={15} weight="fill" className="text-amber-400 shrink-0" aria-hidden="true" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">{t('me.next_action.badge')}</span>
                </div>
                <div>
                    <p className="text-lg font-bold text-white leading-snug text-pretty">{t('me.next_action.not_declared_title', { name: kvkName })}</p>
                    <p className="text-[13px] leading-relaxed text-[var(--text-secondary)] mt-1.5">{t('me.next_action.not_declared_desc')}</p>
                </div>
                <button type="button" onClick={onDeclareClick}
                    className="btn-grad-primary min-h-12 rounded-lg text-white text-[15px] font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110">
                    <Sword size={18} weight="fill" aria-hidden="true" />
                    {t('me.next_action.cta')}
                </button>
            </div>
        );
    }

    // ── Multi-compte : rollup + comptes en attente (ambre) + déclarés (vert) ────
    const total = accounts.length;
    const done = accounts.filter((a) => a.declared);
    const pending = accounts.filter((a) => !a.declared);
    const allDone = pending.length === 0;

    return (
        <div className="flex flex-col gap-3">
            {/* Rollup + barre de progression */}
            <div className="flex items-center gap-2.5">
                <span className="font-mono text-[11px] font-bold text-[var(--text-secondary)] shrink-0">
                    {t('me.rollup', { done: done.length, total })}
                </span>
                <div className="flex-1 h-1 rounded-full bg-slate-700/60 overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(done.length / total) * 100}%` }} />
                </div>
            </div>

            {allDone ? (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30">
                    <CheckCircle size={22} weight="fill" className="text-emerald-400 shrink-0" aria-hidden="true" />
                    <p className="text-sm font-bold text-white">{t('me.next_action.all_declared')}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {pending.map((a) => (
                        <div key={a.governorId} className="v2-glass v2-amber p-3 flex items-center gap-3">
                            <AlertCircle size={16} weight="fill" className="text-amber-400 shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{a.name}</p>
                                <p className="text-[10px] text-[var(--text-secondary)] font-mono">{a.governorId}</p>
                            </div>
                            <TypeBadge type={a.type} isPrimary={a.isPrimary} t={t} />
                            <button type="button" onClick={onDeclareClick}
                                className="btn-grad-primary min-h-9 px-3 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 shrink-0 hover:brightness-110 transition-all">
                                <Sword size={14} weight="fill" aria-hidden="true" />
                                {t('me.next_action.declare_account', { name: a.name })}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Comptes déjà déclarés (discrets) */}
            {done.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    {done.map((a) => (
                        <div key={a.governorId} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 min-h-11">
                            <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-white truncate">{a.name}</p>
                                {(a.declaredAt || a.marchesCount != null) && (
                                    <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                                        {[fmtDate(a.declaredAt), a.marchesCount != null ? t('me.next_action.marches', { count: a.marchesCount }) : null].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>
                            <TypeBadge type={a.type} isPrimary={a.isPrimary} t={t} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NextActionCard;
