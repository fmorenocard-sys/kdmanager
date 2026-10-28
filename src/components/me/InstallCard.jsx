import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from '../ui/icons';

/**
 * InstallCard — « mets l'app sur ton écran d'accueil ».
 *
 * Pourquoi elle existe : un joueur a demandé le 2026-10-27 s'il existait plus
 * rapide que de retaper l'URL. Le manifeste, le service worker et les icônes
 * étaient en place et corrects — vérifié sur la prod le 2026-10-28 — mais
 * l'application, elle, ne proposait RIEN. Or :
 *
 *  - sur iOS, aucun navigateur n'affiche jamais de bouton d'installation.
 *    L'ajout passe uniquement par Partager > « Sur l'écran d'accueil », et
 *    seul Safari le propose de façon fiable (Brave iOS ne l'a pas) ;
 *  - sur Chromium, le navigateur ne montre son bouton que dans un menu que
 *    personne n'ouvre.
 *
 * D'où cette carte : un vrai bouton là où c'est possible, et le chemin exact
 * là où ça ne l'est pas. Elle disparaît dès que l'app tourne en installé.
 */

const CLE_REFUS = 'kdm.install.dismissed';

const estInstalle = () => {
    try {
        // `standalone` est la variante iOS, que `display-mode` n'a jamais couverte.
        return window.matchMedia?.('(display-mode: standalone)')?.matches
            || window.navigator.standalone === true;
    } catch { return false; }
};

const estIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
    // iPadOS 13+ se fait passer pour un Mac ; l'écran tactile le trahit.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Le glyphe « Partager » d'iOS : un cadre, une flèche qui en sort par le haut. */
const GlyphePartage = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 15V3" />
        <path d="m8 7 4-4 4 4" />
        <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
);

const InstallCard = () => {
    const { t } = useTranslation();
    const [invite, setInvite] = useState(null);   // l'événement Chromium, s'il vient
    const [refuse, setRefuse] = useState(() => {
        try { return localStorage.getItem(CLE_REFUS) === '1'; } catch { return false; }
    });
    const [installe, setInstalle] = useState(estInstalle);

    useEffect(() => {
        // Chromium propose l'installation par cet événement, qu'il faut capter
        // AVANT de pouvoir l'ouvrir soi-même. Il n'arrive jamais sur iOS.
        const surInvite = (e) => { e.preventDefault(); setInvite(e); };
        const surInstalle = () => { setInstalle(true); setInvite(null); };
        window.addEventListener('beforeinstallprompt', surInvite);
        window.addEventListener('appinstalled', surInstalle);
        return () => {
            window.removeEventListener('beforeinstallprompt', surInvite);
            window.removeEventListener('appinstalled', surInstalle);
        };
    }, []);

    const ecarter = () => {
        setRefuse(true);
        try { localStorage.setItem(CLE_REFUS, '1'); } catch { /* navigation privée */ }
    };

    const installer = async () => {
        if (!invite) return;
        invite.prompt();
        try { await invite.userChoice; } catch { /* l'utilisateur a fermé */ }
        setInvite(null);
    };

    const ios = estIOS();
    // Rien à montrer : déjà installé, écarté, ou un navigateur qui n'offre
    // aucun chemin (Chromium sans invite — critères non remplis, ou déjà posé).
    if (installe || refuse || (!invite && !ios)) return null;

    return (
        <section className="v2-glass p-4 md:p-5" aria-labelledby="install-titre">
            <div className="flex items-start gap-3">
                <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 ring-1 ring-amber-500/30 text-amber-400">
                    <Plus size={20} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                    <h2 id="install-titre" className="text-[15px] font-bold text-[var(--text-primary)]">
                        {t('me.install.title')}
                    </h2>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                        {t('me.install.subtitle')}
                    </p>

                    {invite ? (
                        <button
                            type="button"
                            onClick={installer}
                            className="btn-grad-primary mt-3 min-h-[44px] px-4 rounded-[10px] text-sm font-bold text-slate-950 inline-flex items-center gap-2"
                        >
                            {t('me.install.button')}
                        </button>
                    ) : (
                        <ol className="mt-3 space-y-1.5 text-[13px] text-[var(--text-secondary)]">
                            {/* Numérotés : c'est une marche à suivre, pas une liste
                                d'options — et l'ordre compte (Brave ne sait pas le faire). */}
                            <li className="flex gap-2">
                                <span className="text-[var(--text-meta)] font-mono shrink-0">1.</span>
                                <span>{t('me.install.ios_step1')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-[var(--text-meta)] font-mono shrink-0">2.</span>
                                <span className="inline-flex items-center gap-1.5 flex-wrap">
                                    {t('me.install.ios_step2')}
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/5 ring-1 ring-white/10 text-[var(--text-primary)]">
                                        <GlyphePartage />
                                    </span>
                                </span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-[var(--text-meta)] font-mono shrink-0">3.</span>
                                <span>{t('me.install.ios_step3')}</span>
                            </li>
                        </ol>
                    )}
                </div>

                <button
                    type="button"
                    onClick={ecarter}
                    aria-label={t('me.install.dismiss')}
                    title={t('me.install.dismiss')}
                    className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[var(--text-meta)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </div>
        </section>
    );
};

export default InstallCard;
