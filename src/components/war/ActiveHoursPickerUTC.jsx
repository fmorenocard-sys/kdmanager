
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from '../ui/icons';

// Generates [ "00:00", "01:00", ... "23:00" ]
const HOURS = Array.from({ length: 24 }, (_, i) =>
    `${String(i).padStart(2, '0')}:00`
);

const HourSelect = ({ value, onChange, id, label }) => (
    <div className="flex flex-col gap-1 flex-1">
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
        </label>
        <select
            id={id}
            value={value}
            onChange={onChange}
            className="w-full bg-slate-700/80 text-white rounded-lg px-3 py-2.5 border border-[var(--border-flat)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors text-sm font-mono appearance-none cursor-pointer"
        >
            <option value="">--:--</option>
            {HOURS.map(h => (
                <option key={h} value={h}>{h}</option>
            ))}
        </select>
    </div>
);

/**
 * ActiveHoursPickerUTC
 * Props:
 *   value: { from: string, to: string }  e.g. { from: "14:00", to: "18:00" }
 *   onChange: (newValue: { from, to }) => void
 */
const ActiveHoursPickerUTC = ({ value = {}, onChange }) => {
    const { t } = useTranslation();
    const from = value.from || '';
    const to = value.to || '';

    const handleFrom = (e) => onChange({ from: e.target.value, to });
    const handleTo   = (e) => onChange({ from, to: e.target.value });

    return (
        <div className="flex flex-col gap-2">
            {/* Label row */}
            <div className="flex items-center gap-2">
                <Clock size={14} className="text-indigo-400 shrink-0" />
                <span className="text-sm font-medium text-slate-400">
                    {t('war.active_hours_utc')}
                </span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    UTC
                </span>
            </div>

            {/* Selects row */}
            <div className="flex items-end gap-2">
                <HourSelect
                    id="active-hours-from"
                    value={from}
                    onChange={handleFrom}
                    label={t('war.active_hours_from')}
                />

                {/* Arrow divider */}
                <div className="pb-2.5 text-slate-500 font-bold shrink-0 select-none">→</div>

                <HourSelect
                    id="active-hours-to"
                    value={to}
                    onChange={handleTo}
                    label={t('war.active_hours_to')}
                />
            </div>

            {/* Helper text */}
            <p className="text-[11px] text-slate-500 leading-relaxed">
                {t('war.active_hours_hint')}
            </p>
        </div>
    );
};

export default ActiveHoursPickerUTC;