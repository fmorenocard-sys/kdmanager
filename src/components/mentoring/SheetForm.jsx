import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { SHEET_SCHEMA, blockProgress, parseNumeric } from '../../lib/mentoringSchema';
import { AlertTriangle, Save, User, Database, Swords, Shield, Target } from '../ui/icons';

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

// Icônes des blocs, nommées dans le schéma (qui reste pur et sans import React).
const BLOCK_ICONS = { User, Database, Swords, Shield, Target };

/** Un champ, rendu selon son `kind`. Tout passe par `onChange(blockId, fieldId, v)`. */
const Field = ({ block, field, value, onChange, t }) => {
    // `labelKey` réutilise un libellé EXISTANT (ex. `war.food` = « Nourriture (B) »)
    // plutôt que d'en créer un jumeau qui finirait par diverger.
    const label = field.labelKey ? t(field.labelKey) : t(`mentoring.fields.${block.id}.${field.id}`);
    const common = { label, id: `${block.id}-${field.id}` };

    // Brouillon de saisie numérique : le TEXTE tapé, conservé tant que le champ
    // a le focus. Sans lui, un champ contrôlé qui réaffiche la valeur *parsée*
    // mange le séparateur décimal à la frappe — « 5, » redevient « 5 », donc
    // 5,6 est impossible à saisir. Invisible tant que les ressources étaient en
    // unités ; bloquant depuis leur passage en MILLIARDS (signalé sur le canal
    // staging le 2026-10-23, où l'on saisit « 5.6 B » et non « 5600000000 »).
    // On ne stocke toujours que le nombre : le brouillon ne sert qu'à l'affichage.
    const [draft, setDraft] = useState(null);

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
            value={draft ?? value ?? ''}
            // Même convention de placeholder que la déclaration : « ex. 5.2 ».
            placeholder={field.example ? t('war.example', { v: field.example }) : undefined}
            onChange={(e) => {
                const raw = e.target.value;
                if (!numeric) return onChange(block.id, field.id, raw || null);
                // On affiche ce qui est tapé, on stocke ce qui est compris : « 5, »
                // reste à l'écran alors que la valeur retenue vaut encore 5, jusqu'à
                // ce que « 5,6 » la fasse passer à 5.6.
                setDraft(raw);
                // `parseNumeric` absorbe les séparateurs de milliers ET la virgule
                // décimale : le joueur lit « 800 000 » dans le jeu et dans le
                // placeholder, il le tapera avec ses espaces, et il tapera « 5,6 »
                // sur un clavier français. Un `Number()` nu rendrait NaN dans les
                // deux cas et viderait le champ en silence.
                onChange(block.id, field.id, parseNumeric(raw));
            }}
            // En quittant le champ, on repasse à la valeur stockée : une saisie
            // inexploitable (« abc ») ne reste pas affichée alors que rien n'a été
            // retenu, et « 5, » se normalise en « 5 ».
            onBlur={numeric ? () => setDraft(null) : undefined}
        />
    );
};

const SheetForm = ({ blocks, setField, progress, saving, error, meta, onDone, initialStep = 0 }) => {
    const { t } = useTranslation();
    // `initialStep` permet d'ouvrir le formulaire sur une étape précise — utile
    // pour un lien direct vers un bloc, et pour les aperçus statiques.
    const [step, setStep] = useState(initialStep);
    const current = STEPS[step];

    // Avancement CHIFFRÉ de chaque étape, pas son verdict en trois mots : le
    // stepper le rend en longueur de jauge, ce qui lui évite d'inventer une
    // couleur par état (cf. `.v2-step` dans index.css).
    const stepStates = useMemo(() => STEPS.map((s) => {
        const parts = s.blocks.map((bid) => blockProgress(blocks[bid], SHEET_SCHEMA.find((b) => b.id === bid)));
        const filled = parts.reduce((n, p) => n + p.filled, 0);
        const total = parts.reduce((n, p) => n + p.total, 0);
        // Une étape sans champ requis est acquise d'avance — même convention que
        // `blockState`, sinon elle resterait éternellement à zéro.
        return { filled, total, pct: total ? filled / total : 1, done: total ? filled === total : true };
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

            {/* Étapes — stepper `.v2-step` : une jauge par étape, remplie au prorata
                des champs attendus. Un seul accent (--grad-accent) et une seule
                forme : c'est la LONGUEUR qui dit l'avancement, là où une pastille
                par état réclamait une couleur par état (émeraude/ambre/gris) et
                chargeait l'écran. L'étape ouverte est simplement la plus lumineuse.

                Au passage, le bug d'origine : l'étape active portait `v2-indigo`
                SANS `v2-glass` — or cette classe n'existe que comme modificateur de
                la carte de verre, elle ne peignait rien, et le bouton actif était le
                seul des quatre à n'avoir aucun fond. */}
            <nav className="flex gap-2" aria-label={t('mentoring.steps_label')}>
                {STEPS.map((s, i) => {
                    const st = stepStates[i];
                    const name = t(`mentoring.steps.${s.id}`);
                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setStep(i)}
                            aria-current={i === step ? 'step' : undefined}
                            // La jauge est muette pour un lecteur d'écran : on lui donne
                            // le compte, dans la même forme nue que la carte de
                            // progression au-dessus (« 12 / 27 »), donc sans chaîne
                            // nouvelle à traduire dans les 10 locales.
                            aria-label={`${name} — ${st.filled} / ${st.total}`}
                            className={`v2-step${i === step ? ' cur' : ''}${st.done ? ' done' : ''}`}
                        >
                            <span className="v2-step-track" aria-hidden="true">
                                <span className="v2-step-fill" style={{ width: `${Math.round(st.pct * 100)}%` }} />
                            </span>
                            <span className="v2-step-label" aria-hidden="true">
                                <span className="v2-step-num">{String(i + 1).padStart(2, '0')}</span>
                                <span className="v2-step-name">{name}</span>
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* Champs de l'étape */}
            <section className="v2-glass p-4 md:p-5 space-y-4">
                {current.blocks.map((bid) => {
                    const block = SHEET_SCHEMA.find((b) => b.id === bid);
                    const Icon = BLOCK_ICONS[block.icon] || Target;
                    return (
                        // Même encart que `AvailabilityForm` : fond `--border-flat`,
                        // titre coloré précédé d'une icône. Les deux formulaires se
                        // ressemblent parce que le joueur y fait le même geste.
                        <div key={bid} className="bg-[var(--border-flat)] p-3 md:p-4 rounded-lg">
                            <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${block.accent || 'text-white'}`}>
                                <Icon size={18} /> {t(`mentoring.blocks.${bid}`)}
                            </h3>
                            {/* Grille de la déclaration : 2 colonnes dès le mobile pour
                                les champs courts, 4 en desktop. Les champs longs
                                (texte libre, heures) prennent toute la largeur. */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                {block.fields.map((f) => {
                                    const wide = f.id === 'missing' || f.kind === 'text' || f.kind === 'hours' || f.kind === 'enum';
                                    return (
                                        <div key={f.id} className={wide ? 'col-span-2' : ''}>
                                            <Field block={block} field={f} value={blocks[bid]?.[f.id]} onChange={setField} t={t} />
                                        </div>
                                    );
                                })}
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
                    /* `disabled` pendant l'écriture : sans lui, un clic sans effet
                       visible invite à recliquer — c'est exactement ce qui s'est
                       passé (quatre fois, puis un rechargement de page). */
                    <Button onClick={onDone} disabled={saving}>
                        <Save size={16} className="me-2" />
                        {saving ? t('mentoring.saving') : t('mentoring.finish')}
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
