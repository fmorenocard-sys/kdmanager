import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { SHEET_SCHEMA, blockState } from '../../lib/mentoringSchema';
import { CheckCircle2, Clock, AlertTriangle, Save } from '../ui/icons';

/**
 * SheetForm — E-010 / F-039 : saisie de la fiche d'état de compte.
 *
 * **Entièrement piloté par `mentoringSchema`** : aucun champ n'est écrit ici en dur.
 * Ajouter un champ au schéma le fait apparaître dans le formulaire, dans la
 * complétude, dans la comparaison de versions et dans l'export — sans toucher ce
 * fichier. C'est ce qui rend la fiche extensible sans dette.
 *
 * Quatre étapes plutôt qu'une page longue : le brief vise ~10 minutes sur mobile,
 * et une page de 27 champs sur 360 px décourage avant le premier tiers.
 *
 * `null` n'est pas `0` (cf. schéma) : un champ vide reste vide, il n'est jamais
 * initialisé à zéro — sinon « je n'ai rien » et « je n'ai pas répondu » deviennent
 * indiscernables, le défaut d'`AvailabilityForm`.
 */

// Les 5 blocs du schéma en 4 étapes : l'objectif du joueur tient en une phrase et
// n'a pas besoin d'une étape à lui.
const STEPS = [
    { id: 'identity', blocks: ['identity'] },
    { id: 'economy', blocks: ['economy'] },
    { id: 'military', blocks: ['military'] },
    { id: 'commanders', blocks: ['commanders', 'goal'] },
];

const stateIcon = (state) => (
    state === 'done' ? <CheckCircle2 size={14} className="text-emerald-400" />
        : state === 'doing' ? <Clock size={14} className="text-amber-400" />
            : <span className="w-3.5 h-3.5 rounded-full border border-[var(--border-flat)]" />
);

/** Un champ, rendu selon son `kind`. Tout passe par `onChange(blockId, fieldId, v)`. */
const Field = ({ block, field, value, onChange, t }) => {
    const label = t(`mentoring.fields.${block.id}.${field.id}`);
    const common = { label, id: `${block.id}-${field.id}` };

    if (field.kind === 'bool') {
        return (
            <div className="w-full">
                <span className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">{label}</span>
                <div className="flex gap-2" role="group" aria-label={label}>
                    {[true, false].map((v) => (
                        <button
                            key={String(v)}
                            type="button"
                            aria-pressed={value === v}
                            onClick={() => onChange(block.id, field.id, value === v ? null : v)}
                            className={`min-h-[44px] px-4 rounded-[10px] text-sm font-semibold border transition-colors ${
                                value === v
                                    ? 'btn-grad-primary text-white border-transparent'
                                    : 'border-[var(--border-flat)] text-[var(--text-secondary)] hover:bg-white/5'
                            }`}
                        >
                            {t(v ? 'common.yes' : 'common.no')}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (field.kind === 'enum') {
        return (
            <div className="w-full">
                <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor={common.id}>{label}</label>
                <select
                    id={common.id}
                    value={value ?? ''}
                    onChange={(e) => onChange(block.id, field.id, e.target.value || null)}
                    className="w-full min-h-[44px] px-3.5 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-[10px] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                    <option value="">{t('mentoring.not_set')}</option>
                    {(field.options || []).map((o) => (
                        <option key={o} value={o}>{t(`war.troop_${o.toLowerCase()}`, o)}</option>
                    ))}
                </select>
            </div>
        );
    }

    if (field.kind === 'hours') {
        const v = value || { from: '', to: '' };
        return (
            <div className="w-full">
                <span className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">{label}</span>
                <div className="flex items-center gap-2">
                    {['from', 'to'].map((part) => (
                        <input
                            key={part}
                            type="time"
                            aria-label={`${label} — ${t(`mentoring.hours_${part}`)}`}
                            value={v[part] || ''}
                            onChange={(e) => onChange(block.id, field.id, { ...v, [part]: e.target.value })}
                            className="min-h-[44px] flex-1 min-w-0 px-3 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-[10px] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (field.kind === 'text' && field.id === 'missing') {
        return (
            <div className="w-full">
                <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5" htmlFor={common.id}>{label}</label>
                <textarea
                    id={common.id}
                    rows={3}
                    value={value ?? ''}
                    onChange={(e) => onChange(block.id, field.id, e.target.value || null)}
                    className="w-full px-3.5 py-2.5 bg-[var(--surface-input)] border border-[var(--border-flat)] rounded-[10px] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
            </div>
        );
    }

    const numeric = field.kind === 'number' || field.kind === 'days';
    return (
        <Input
            {...common}
            type={numeric ? 'text' : 'text'}
            // `inputmode` plutôt que type=number : le clavier numérique s'ouvre sur
            // mobile sans les flèches ni le défilement accidentel de type=number.
            inputMode={numeric ? 'decimal' : undefined}
            readOnly={field.readOnly}
            disabled={field.readOnly}
            value={value ?? ''}
            placeholder={field.unit ? t(`mentoring.unit_${field.unit}`) : undefined}
            onChange={(e) => {
                const raw = e.target.value;
                if (!numeric) return onChange(block.id, field.id, raw || null);
                if (raw === '') return onChange(block.id, field.id, null); // vide ≠ 0
                const n = Number(raw.replace(',', '.'));
                onChange(block.id, field.id, Number.isFinite(n) ? n : null);
            }}
        />
    );
};

const SheetForm = ({ blocks, setField, progress, saving, error, meta, onDone }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(0);
    const current = STEPS[step];

    const stepStates = useMemo(() => STEPS.map((s) => {
        const states = s.blocks.map((bid) => blockState(blocks[bid], SHEET_SCHEMA.find((b) => b.id === bid)));
        if (states.every((x) => x === 'done')) return 'done';
        return states.some((x) => x !== 'todo') ? 'doing' : 'todo';
    }), [blocks]);

    const isLast = step === STEPS.length - 1;

    return (
        <div className="space-y-5">
            {/* Progression — B4 : « voir ce qui manque » */}
            <section className="v2-glass p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 className="text-[15px] font-semibold text-white">{t('mentoring.progress_title')}</h2>
                    <span className="text-sm font-mono text-[var(--text-secondary)]">
                        {progress.done} / {progress.total}
                    </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--border-flat)] overflow-hidden" role="progressbar"
                    aria-valuenow={Math.round(progress.percent * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress.percent * 100}%`, background: 'var(--grad-accent)' }} />
                </div>

                {/* Qui a saisi — le joueur doit savoir que son mentor a rempli pour lui */}
                {meta?.enteredBy && (
                    <p className="text-xs text-[var(--text-meta)] mt-3">
                        {t('mentoring.entered_by', { role: meta.enteredByRole || '—' })}
                    </p>
                )}
            </section>

            {/* Étapes */}
            <nav className="flex flex-wrap gap-2" aria-label={t('mentoring.steps_label')}>
                {STEPS.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => setStep(i)}
                        aria-current={i === step ? 'step' : undefined}
                        className={`flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-[13px] font-semibold border transition-colors ${
                            i === step ? 'v2-indigo text-white border-transparent'
                                : 'border-[var(--border-flat)] text-[var(--text-secondary)] hover:bg-white/5'
                        }`}
                    >
                        {stateIcon(stepStates[i])}
                        {t(`mentoring.steps.${s.id}`)}
                    </button>
                ))}
            </nav>

            {/* Champs de l'étape */}
            <section className="v2-glass p-4 md:p-5 space-y-4">
                {current.blocks.map((bid) => {
                    const block = SHEET_SCHEMA.find((b) => b.id === bid);
                    return (
                        <div key={bid} className="space-y-4">
                            <h3 className="text-[15px] font-semibold text-white">{t(`mentoring.blocks.${bid}`)}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {block.fields.map((f) => (
                                    <div key={f.id} className={f.id === 'missing' ? 'sm:col-span-2' : ''}>
                                        <Field block={block} field={f} value={blocks[bid]?.[f.id]} onChange={setField} t={t} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* Récap de ce qui manque, sur la dernière étape seulement */}
            {isLast && progress.missing.length > 0 && (
                <section className="v2-glass p-4 md:p-5">
                    <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white mb-2">
                        <AlertTriangle size={17} className="text-amber-400" />
                        {t('mentoring.missing_title', { count: progress.missing.length })}
                    </h3>
                    <ul className="flex flex-wrap gap-2">
                        {progress.missing.map((m) => (
                            <li key={`${m.block}.${m.field}`}>
                                <button
                                    type="button"
                                    onClick={() => setStep(STEPS.findIndex((s) => s.blocks.includes(m.block)))}
                                    className="px-2.5 py-1 rounded-full text-xs border border-[var(--border-flat)] text-[var(--text-secondary)] hover:bg-white/5"
                                >
                                    {t(`mentoring.fields.${m.block}.${m.field}`)}
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Navigation */}
            <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                    {t('common.previous')}
                </Button>
                {!isLast ? (
                    <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                        {t('common.next')}
                    </Button>
                ) : (
                    <Button onClick={onDone}>
                        <Save size={16} className="me-2" />
                        {t('mentoring.finish')}
                    </Button>
                )}
                <span className="text-xs text-[var(--text-meta)]" role="status">
                    {error ? t('mentoring.save_error') : saving ? t('mentoring.saving') : t('mentoring.saved')}
                </span>
            </div>
        </div>
    );
};

export default SheetForm;
