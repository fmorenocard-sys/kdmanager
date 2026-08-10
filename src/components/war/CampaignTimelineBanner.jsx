import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from '../ui/icons';

// F-031 (E-008) — Bandeau de progression de campagne KvK, en tête de l'onglet Objectifs.
//
// Donne le CONTEXTE TEMPOREL aux objectifs (« tu es à 40 % ET on est au jour 15/52,
// avant les gros Pass ») — c'est précisément ce qui manquait et qui a motivé BR-019
// (masquer les pastilles de statut faute de contexte). Visible Warriors+ (D1).
//
// Donnée : `kvk_config/current.timeline` = [{key, label, at (ISO UTC), category}],
// saisie King par campagne/instance (jamais codée en dur — multi-tenant). Absente
// → le bandeau ne s'affiche pas (aucun bruit).

// Compact, neutre en langue (comme la copie objectifs) : "3d 2h 32m 48s".
function formatCountdown(ms) {
    if (ms <= 0) return '0m';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h || d) parts.push(`${h}h`);
    parts.push(`${m}m`);
    if (!d) parts.push(`${sec}s`); // secondes seulement sous la journée, comme ProKingdoms
    return parts.join(' ');
}

const CampaignTimelineBanner = ({ timeline, campaignName }) => {
    const { t, i18n } = useTranslation();
    const [showLocal, setShowLocal] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    // Tick chaque seconde pour le compte à rebours (nettoyé au démontage).
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const events = useMemo(() => {
        if (!Array.isArray(timeline)) return [];
        return timeline
            .map((e) => ({ ...e, ts: Date.parse(e.at) }))
            .filter((e) => Number.isFinite(e.ts) && e.label)
            .sort((a, b) => a.ts - b.ts);
    }, [timeline]);

    if (events.length === 0) return null;

    const first = events[0];
    const last = events[events.length - 1];
    const nextIdx = events.findIndex((e) => e.ts > now);
    const next = nextIdx >= 0 ? events[nextIdx] : null;
    const doneCount = nextIdx >= 0 ? nextIdx : events.length;
    const progress = last.ts > first.ts
        ? Math.min(1, Math.max(0, (now - first.ts) / (last.ts - first.ts)))
        : (now >= last.ts ? 1 : 0);

    const fmtDate = (ts) => new Intl.DateTimeFormat(i18n.language || 'en', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        timeZone: showLocal ? undefined : 'UTC',
    }).format(ts) + (showLocal ? '' : ' UTC');

    return (
        <div className="rounded-xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/30 via-slate-900/50 to-slate-900/70 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Calendar size={16} className="text-indigo-300 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300 truncate">
                        {t('calendar.campaign_progress')}
                        {campaignName ? <span className="text-slate-500 normal-case font-normal tracking-normal"> · {campaignName}</span> : null}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setShowLocal((v) => !v)}
                    className="shrink-0 text-[10px] font-mono px-2 py-1 rounded-md border border-[var(--border-flat)] text-slate-400 hover:text-white min-h-[28px]"
                    aria-label={t('calendar.toggle_timezone')}
                >
                    {showLocal ? t('calendar.local') : 'UTC'}
                </button>
            </div>

            {/* Barre de progression : premier → dernier jalon, marqueur « maintenant » */}
            <div className="relative h-1.5 rounded-full bg-slate-700/60 overflow-hidden mb-2">
                <div className="absolute inset-y-0 start-0 bg-indigo-500/70 rounded-full" style={{ width: `${progress * 100}%` }} />
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-[11px] text-slate-500 font-mono">
                    {t('calendar.milestones_done', { done: doneCount, total: events.length })}
                </span>
                {next ? (
                    <span className="text-xs text-slate-300 min-w-0">
                        <span className="text-slate-500">{t('calendar.next')} · </span>
                        <span className="font-semibold text-white">{next.label}</span>
                        <span className="text-slate-500"> · {fmtDate(next.ts)} · </span>
                        <span className="font-mono font-bold text-amber-400">{formatCountdown(next.ts - now)}</span>
                    </span>
                ) : (
                    <span className="text-xs font-semibold text-emerald-400">{t('calendar.finished')}</span>
                )}
            </div>
        </div>
    );
};

export default CampaignTimelineBanner;
