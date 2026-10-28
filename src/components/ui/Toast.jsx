import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from './icons';

/**
 * Toast — accusé de réception éphémère, motif UNIQUE de l'app pour « c'est fait ».
 *
 * Pourquoi il existe : au 2026-10-28, l'app disait « ça a marché » de quatre
 * façons — `alert()` natif (7 appels dans MaintenanceTools), ligne `message`
 * émeraude/rouge (RaceConfigForm, RaceView, CampaignArchiveControl), texte
 * `role="status"` discret, et un écran de confirmation pleine page ajouté la
 * veille pour la fiche de mentorat. Quatre variantes pour un même besoin, ce
 * que `.agent/rules/designer.md` §2.4 proscrit. Celui-ci a vocation à les
 * remplacer, en commençant par l'écran pleine page qu'il rend inutile.
 *
 * ⚠️ UN TOAST DISPARAÎT. Il convient à ce qui est jetable — « enregistré »,
 * « copié », « envoyé ». Jamais à ce qui doit être lu et compris : une erreur
 * bloquante reste affichée sur la page, là où l'utilisateur peut y revenir.
 * La variante `error` sert aux échecs qu'on peut simplement retenter.
 *
 * Il survit à la navigation, puisqu'il est monté au-dessus des routes : c'est
 * ce qui permet de confirmer une action ET de changer de page du même geste.
 */

const ToastContext = createContext(() => {});

/**
 * @returns {(texte: string, options?: {variant?: 'success'|'error', duree?: number}) => void}
 */
// Provider + hook dans le même fichier : c'est le motif déjà suivi par
// AuthContext, RoleContext et DataContext. On garde la cohérence et on fait
// taire la règle ici, plutôt que d'ajouter une erreur de plus au décompte.
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);

const VARIANTES = {
    success: { Icone: CheckCircle2, couleur: 'text-emerald-400' },
    error: { Icone: AlertTriangle, couleur: 'text-red-400' },
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const compteur = useRef(0);
    const minuteurs = useRef(new Map());

    const retirer = useCallback((id) => {
        setToasts((liste) => liste.filter((t) => t.id !== id));
        const m = minuteurs.current.get(id);
        if (m) { clearTimeout(m); minuteurs.current.delete(id); }
    }, []);

    const afficher = useCallback((texte, { variant = 'success', duree = 4000 } = {}) => {
        const id = ++compteur.current;
        setToasts((liste) => [...liste, { id, texte, variant }]);
        minuteurs.current.set(id, setTimeout(() => retirer(id), duree));
    }, [retirer]);

    // Les minuteurs en vol doivent mourir avec le provider, sinon un setState
    // part sur un composant démonté.
    useEffect(() => {
        const m = minuteurs.current;
        return () => { m.forEach(clearTimeout); m.clear(); };
    }, []);

    const valeur = useMemo(() => afficher, [afficher]);

    return (
        <ToastContext.Provider value={valeur}>
            {children}
            {/* Bas de l'écran, centré en mobile et aligné à la fin en desktop.
                `inset-inline` plutôt que left/right : en arabe, la pile doit
                basculer de l'autre côté. Les encoches sont dégagées par
                `env(safe-area-inset-*)`, sinon la pile passe sous la barre
                système d'un téléphone. */}
            <div
                className="fixed z-[60] flex flex-col gap-2 items-center md:items-end pointer-events-none"
                style={{
                    insetInlineStart: 'max(16px, env(safe-area-inset-left, 0px))',
                    insetInlineEnd: 'max(16px, env(safe-area-inset-right, 0px))',
                    bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
                }}
            >
                {toasts.map((t) => {
                    const { Icone, couleur } = VARIANTES[t.variant] || VARIANTES.success;
                    return (
                        <div
                            key={t.id}
                            role="status"
                            aria-live="polite"
                            className="v2-glass pointer-events-auto flex items-center gap-3 ps-4 pe-2 py-3 max-w-sm w-full md:w-auto motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
                        >
                            <Icone size={18} className={`${couleur} shrink-0`} aria-hidden="true" />
                            <span className="text-sm font-semibold text-[var(--text-primary)] min-w-0">{t.texte}</span>
                            {/* Fermeture manuelle : un toast qui s'en va tout seul
                                ne doit pas pour autant retenir quelqu'un qui a lu. */}
                            <button
                                type="button"
                                onClick={() => retirer(t.id)}
                                aria-label="×"
                                className="ms-auto shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-meta)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                            >
                                <X size={15} aria-hidden="true" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
