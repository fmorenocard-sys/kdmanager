/**
 * F-032 — Squelette de chargement de l'espace « Moi ». Calé sur la géométrie
 * réelle des cartes (carte action + calendrier + objectif) pour éviter tout saut
 * de layout quand la donnée arrive (spec §6.2, état Loading). Pas de spinner.
 * Purement décoratif → aria-hidden, aucune chaîne i18n.
 */
const Bar = ({ className = '' }) => (
    <div className={`rounded bg-slate-400/10 animate-pulse ${className}`} />
);

const LoadingSkeleton = () => (
    <div className="flex flex-col gap-3.5" aria-hidden="true">
        <div className="v2-glass p-4 md:p-5 flex flex-col gap-3">
            <Bar className="w-24 h-2.5 rounded-full" />
            <Bar className="w-full h-5" />
            <Bar className="w-3/4 h-3.5" />
            <Bar className="w-full h-12 rounded-lg" />
        </div>
        <div className="v2-glass p-4 flex flex-col gap-2.5">
            <Bar className="w-20 h-2 rounded-full" />
            <Bar className="w-full h-2 rounded-full" />
            <div className="grid grid-cols-2 gap-2">
                <Bar className="h-11 rounded-lg" />
                <Bar className="h-11 rounded-lg" />
            </div>
        </div>
        <div className="v2-glass p-4 flex flex-col gap-2.5">
            <Bar className="w-20 h-2 rounded-full" />
            <Bar className="w-full h-9 rounded-lg" />
        </div>
    </div>
);

export default LoadingSkeleton;
