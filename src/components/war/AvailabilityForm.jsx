
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import AccessGate from '../ui/AccessGate';
import CommanderSelector from './CommanderSelector';
import ActiveHoursPickerUTC from './ActiveHoursPickerUTC';
import { COMMANDERS } from '../../data/commanders';
import { Save, User, Database, Swords, Zap, X, Calendar } from '../ui/icons';

const AvailabilityForm = () => {
    const { currentUser, governorId, linkGovernor } = useAuth();



    const { players } = useData();
    const { t, i18n } = useTranslation();

    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [kvkConfig, setKvkConfig] = useState(null);

    const [formData, setFormData] = useState({
        governorName: '',
        governorId: '',
        availability: 'Available',
        crystalTech: 'Low',
        activeHoursUTC: { from: '', to: '' },
        resources: { food: 0, wood: 0, stone: 0, gold: 0 },
        speedups: { total: 0 },
        marches: [] // { type: 'Infantry', primary: 'alexander_the_great', secondary: 'ysg' }
    });

    const [marchInput, setMarchInput] = useState({ type: 'Infantry', primary: '', secondary: '' });

    // Pre-fill and Nickname Lookup
    useEffect(() => {
        if (currentUser) {
            let name = currentUser.displayName || '';
            let id = governorId || '';

            if (id) {
                const player = players.find(p => String(p.id) === String(id));
                if (player) {
                    name = player.name;
                }
            }

            setFormData(prev => ({
                ...prev,
                governorName: name,
                governorId: id
            }));
        }
    }, [currentUser, governorId, players]);

    // Dynamic Lookup when governorId changes (manually typed or prefilled)
    useEffect(() => {
        if (formData.governorId && players.length > 0) {
            const player = players.find(p => String(p.id) === String(formData.governorId));
            if (player && player.name && player.name !== formData.governorName) {
                setFormData(prev => ({
                    ...prev,
                    governorName: player.name
                }));
            }
        }
    }, [formData.governorId, players]);

    // Fetch the overarching KvK dates and the user's specific submission if logged in
    useEffect(() => {
        const fetchConfigAndData = async () => {
            try {
                const configRef = doc(db, "kvk_config", "current");
                const configSnap = await getDoc(configRef);

                let currentKvkId = 'default_kvk';
                let configData = null;

                if (configSnap.exists()) {
                    const data = configSnap.data();
                    const startDateStr = data.startDate ? new Date(data.startDate.seconds * 1000).toISOString().split('T')[0] : '';
                    const endDateStr = data.endDate ? new Date(data.endDate.seconds * 1000).toISOString().split('T')[0] : '';

                    configData = {
                        id: data.id,
                        name: data.name,
                        startDate: startDateStr,
                        endDate: endDateStr,
                        status: data.status || null // BR-013: 'closed' hors saison
                    };
                    setKvkConfig(configData);
                    currentKvkId = data.id || `${configData.name}_${configData.startDate.replace(/-/g, '_')}`.toLowerCase().replace(/\s+/g, '_');
                }

                // If user is logged in, query their specific declaration for THIS KvK
                if (currentUser) {
                    const docId = `${currentKvkId}_${currentUser.uid}`;
                    const docRef = doc(db, "war_availabilities", docId);
                    const sn = await getDoc(docRef);
                    if (sn.exists()) {
                        const data = sn.data();
                        setFormData(prev => ({
                            ...prev,
                            ...data,
                            // Ensure activeHoursUTC is always an object
                            activeHoursUTC: data.activeHoursUTC || { from: '', to: '' }
                        }));
                    }
                }
            } catch (e) {
                console.log("Error fetching config or declaration", e);
            }
        };

        fetchConfigAndData();
    }, [currentUser]);



    const handleResourceChange = (e) => {
        const { name, value } = e.target;
        // Allow empty string to clear the input, otherwise parse as integer
        const newValue = value === '' ? '' : parseFloat(value);
        setFormData(prev => ({
            ...prev,
            resources: { ...prev.resources, [name]: newValue }
        }));
    };

    const handleSpeedupChange = (e) => {
        const { value } = e.target;
        const newValue = value === '' ? '' : parseFloat(value);
        setFormData(prev => ({
            ...prev,
            speedups: { total: newValue }
        }));
    };

    const addMarch = () => {
        if (!marchInput.primary || !marchInput.secondary) return;
        setFormData(prev => ({
            ...prev,
            marches: [...prev.marches, { ...marchInput }]
        }));
        setMarchInput({ type: 'Infantry', primary: '', secondary: '' });
    };

    const removeMarch = (index) => {
        setFormData(prev => ({
            ...prev,
            marches: prev.marches.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (kvkConfig?.status === 'closed') return; // BR-013
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        if (!formData.governorName || !formData.governorId) {
            setErrorMsg(t('war.form_required'));
            setLoading(false);
            return;
        }

        try {
            // Auto-link if authenticated and ID provided
            if (currentUser && formData.governorId && formData.governorId !== governorId) {
                linkGovernor(formData.governorId);
            }

            let localKvkId = 'default_kvk';
            let kvkName = null;
            if (!kvkConfig) {
                const configRef = doc(db, "kvk_config", "current");
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    const data = configSnap.data();
                    kvkName = data.name;
                    const startDateStr = data.startDate ? new Date(data.startDate.seconds * 1000).toISOString().split('T')[0] : '';
                    localKvkId = data.id || `${data.name}_${startDateStr.replace(/-/g, '_')}`.toLowerCase().replace(/\s+/g, '_');
                }
            } else {
                localKvkId = kvkConfig.id || `${kvkConfig.name}_${kvkConfig.startDate.replace(/-/g, '_')}`.toLowerCase().replace(/\s+/g, '_');
                kvkName = kvkConfig.name;
            }

            const docId = currentUser ? `${localKvkId}_${currentUser.uid}` : `${localKvkId}_guest_${formData.governorId}`;

            // Ensure resources are saved as numbers (0 if empty)
            const sanitizedResources = {
                food: Number(formData.resources.food) || 0,
                wood: Number(formData.resources.wood) || 0,
                stone: Number(formData.resources.stone) || 0,
                gold: Number(formData.resources.gold) || 0
            };

            const sanitizedSpeedups = {
                total: Number(formData.speedups?.total) || 0
            };

            // Sanitize activeHoursUTC — ensure it is a clean object
            const sanitizedActiveHours = {
                from: formData.activeHoursUTC?.from || '',
                to: formData.activeHoursUTC?.to || ''
            };

            await setDoc(doc(db, "war_availabilities", docId), {
                ...formData,
                resources: sanitizedResources,
                speedups: sanitizedSpeedups,
                activeHoursUTC: sanitizedActiveHours,
                userId: currentUser ? currentUser.uid : 'guest',
                kvkId: localKvkId,
                kvkName: kvkName || 'Unknown',
                updatedAt: Timestamp.now()
            });

            setSuccessMsg(t('war.submit_success'));
        } catch (err) {
            console.error("Error saving:", err);
            setErrorMsg(t('war.submit_error'));
        }
        setLoading(false);
    };

    const getCmdImage = (id) => COMMANDERS.find(c => c.id === id)?.image || null;
    const getCmdName = (id) => COMMANDERS.find(c => c.id === id)?.name || id;

    // BR-013: campagne clôturée par le Roi — déclarations gelées jusqu'à la prochaine saison
    const isClosedSeason = kvkConfig?.status === 'closed';

    if (!currentUser) {
        return (
            <AccessGate
                icon={User}
                title={t('war.auth_required_title')}
                description={t('war.auth_required_desc')}
                hint={t('war.auth_required_hint')}
            />
        );
    }

    return (
        <Card className="w-full space-y-5">
            <div className="space-y-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Swords className="text-red-500" />
                        {t('war.declaration_form')}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        {t('war.form_description')}
                    </p>
                </div>

                {isClosedSeason && (
                    <div className="bg-slate-800/40 border border-[var(--border-flat)] p-4 rounded-xl flex items-center gap-4">
                        <div className="bg-[var(--border-flat)] p-3 rounded-lg text-slate-400">
                            <Calendar size={24} />
                        </div>
                        <p className="text-sm text-slate-300">{t('war.no_active_campaign')}</p>
                    </div>
                )}

                {kvkConfig && !isClosedSeason && (
                    <div className="bg-gradient-to-r from-indigo-900/40 via-slate-800/40 to-slate-900/40 border border-indigo-500/30 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden shadow-lg">
                        {/* Decorative glow */}
                        <div className="absolute top-0 start-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full"></div>

                        <div className="bg-indigo-500/20 ring-1 ring-indigo-500/40 p-3 rounded-lg text-indigo-400 relative z-10">
                            <Calendar size={24} />
                        </div>
                        <div className="flex flex-col relative z-10">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Active Campaign</span>
                            <h3 className="text-lg md:text-xl font-bold text-white leading-tight">{kvkConfig.name}</h3>
                            {(kvkConfig.startDate || kvkConfig.endDate) && (
                                <span className="text-slate-300 text-xs md:text-sm mt-1.5 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
                                    {kvkConfig.startDate && new Intl.DateTimeFormat(i18n.language || 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(kvkConfig.startDate))}
                                    <span className="text-slate-500">—</span>
                                    {kvkConfig.endDate && new Intl.DateTimeFormat(i18n.language || 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(kvkConfig.endDate))}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Identity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label={t('war.governor')}
                    value={formData.governorName}
                    onChange={(e) => setFormData({ ...formData, governorName: e.target.value })}
                    placeholder={t('war.governor')}
                    disabled={!!currentUser && !!governorId}
                    leftIcon={<User size={16} />}
                />
                <Input
                    label={t('dashboard.governor_id')}
                    value={formData.governorId}
                    onChange={(e) => setFormData({ ...formData, governorId: e.target.value })}
                    placeholder="12345678"
                    disabled={!!currentUser && !!governorId}
                    leftIcon={<span className="text-xs font-mono">#</span>}
                />
            </div>

            {/* Availability + Crystal Tech row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">{t('war.availability')}</label>
                    <select
                        className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-[var(--border-flat)] focus:outline-none focus:border-indigo-500"
                        value={formData.availability}
                        onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    >
                        <option value="Available">🟢 {t('statuses.available')}</option>
                        <option value="Partial">🟡 {t('statuses.partial')}</option>
                        <option value="Unavailable">🔴 {t('statuses.unavailable')}</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">{t('war.crystal_tech')}</label>
                    <select
                        className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-[var(--border-flat)] focus:outline-none focus:border-indigo-500"
                        value={formData.crystalTech}
                        onChange={(e) => setFormData({ ...formData, crystalTech: e.target.value })}
                    >
                        <option value="F2P">F2P (No Spend)</option>
                        <option value="Low">Low Spend (Pop-ups)</option>
                        <option value="Mid">Mid Spend (Max Tech)</option>
                        <option value="High">High / Whale</option>
                    </select>
                </div>
            </div>

            {/* Active Hours UTC — full-width dedicated section */}
            <div className="bg-[var(--border-flat)] p-3 md:p-4 rounded-lg">
                <ActiveHoursPickerUTC
                    value={formData.activeHoursUTC}
                    onChange={(val) => setFormData(prev => ({ ...prev, activeHoursUTC: val }))}
                />
            </div>

            <div className="bg-[var(--border-flat)] p-3 md:p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-amber-500 mb-3 flex items-center gap-2">
                    <Database size={18} /> {t('war.resources')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input label="Food (B)" name="food" type="number" value={formData.resources.food === 0 ? '' : formData.resources.food} onChange={handleResourceChange} placeholder="e.g. 5.2" />
                    <Input label="Wood (B)" name="wood" type="number" value={formData.resources.wood === 0 ? '' : formData.resources.wood} onChange={handleResourceChange} placeholder="e.g. 3.1" />
                    <Input label="Stone (B)" name="stone" type="number" value={formData.resources.stone === 0 ? '' : formData.resources.stone} onChange={handleResourceChange} placeholder="e.g. 2.5" />
                    <Input label="Gold (B)" name="gold" type="number" value={formData.resources.gold === 0 ? '' : formData.resources.gold} onChange={handleResourceChange} placeholder="e.g. 1.0" />
                </div>
            </div>

            {/* Speedups */}
            <div className="bg-[var(--border-flat)] p-3 md:p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    <Zap size={18} /> {t('war.speedups')}
                </h3>
                <Input
                    label="Total Speedups — Universal + Healing (days)"
                    name="total"
                    type="number"
                    value={(formData.speedups?.total === 0 || formData.speedups?.total === undefined) ? '' : formData.speedups.total}
                    onChange={handleSpeedupChange}
                    placeholder="e.g. 45 (add universal + healing days together)"
                />
            </div>

            {/* Marches (Updated with Selector) */}
            <div className="bg-[var(--border-flat)] p-3 md:p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <Zap size={18} /> {t('war.marches')}
                </h3>

                <div className="space-y-3 mb-4">
                    {formData.marches.map((m, idx) => (
                        <div key={idx} className="flex justify-between items-center gap-2 bg-[var(--surface-solid)] p-2.5 rounded border border-[var(--border-flat)] min-w-0">
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${m.type === 'Infantry' ? 'bg-blue-500/20 text-blue-400' :
                                    m.type === 'Cavalry' ? 'bg-red-500/20 text-red-400' :
                                        m.type === 'Archer' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-500'
                                    }`}>{m.type}</span>

                                <div className="flex items-center gap-[-10px]">
                                    <img src={getCmdImage(m.primary)} alt="" className="w-8 h-8 rounded-full border-2 border-[var(--border-flat)] z-10" />
                                    <img src={getCmdImage(m.secondary)} alt="" className="w-8 h-8 rounded-full border-2 border-[var(--border-flat)] -ms-3 z-0" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium text-slate-200 truncate">{getCmdName(m.primary)}</span>
                                    <span className="text-xs text-slate-400 truncate">+ {getCmdName(m.secondary)}</span>
                                </div>
                            </div>
                            <button onClick={() => removeMarch(idx)} className="text-slate-500 hover:text-red-400 p-1">
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                    {formData.marches.length === 0 && <p className="text-slate-500 text-sm italic">{t('war.no_marches')}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-[var(--border-flat)] p-3 rounded-lg border border-[var(--border-flat)]">
                    <div className="col-span-1 md:col-span-3">
                        <label className="text-xs text-slate-400 mb-1 block">{t('war.march_type')}</label>
                        <select
                            className="w-full bg-slate-700 text-white rounded-lg px-3 border border-[var(--border-flat)] text-sm h-12 focus:outline-none focus:border-indigo-500 transition-colors"
                            value={marchInput.type}
                            onChange={e => setMarchInput({ ...marchInput, type: e.target.value })}
                        >
                            <option value="Infantry">Infantry</option>
                            <option value="Cavalry">Cavalry</option>
                            <option value="Archer">Archer</option>
                            <option value="Siege">Siege</option>
                        </select>
                    </div>

                    <div className="col-span-1 md:col-span-3 relative">
                        <label className="text-xs text-slate-400 mb-1 block">{t('war.commander_primary')}</label>
                        <CommanderSelector
                            selectedId={marchInput.primary}
                            onSelect={(id) => setMarchInput(prev => ({ ...prev, primary: id }))}
                            excludeIds={[marchInput.secondary].filter(Boolean)}
                            label="Primary"
                        />
                    </div>

                    <div className="col-span-1 md:col-span-3 relative">
                        <label className="text-xs text-slate-400 mb-1 block">{t('war.commander_secondary')}</label>
                        <CommanderSelector
                            selectedId={marchInput.secondary}
                            onSelect={(id) => setMarchInput(prev => ({ ...prev, secondary: id }))}
                            excludeIds={[marchInput.primary].filter(Boolean)}
                            label="Secondary"
                        />
                    </div>

                    <div className="col-span-1 md:col-span-3 mt-2 md:mt-0 flex flex-col justify-end">
                        <div className="h-[20px] hidden md:block" /> {/* Spacer to align with labels */}
                        <Button onClick={addMarch} disabled={!marchInput.primary || !marchInput.secondary} className="w-full h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-lg transition-all active:scale-95 text-sm font-medium">
                            {t('war.add_march')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4">
                <Button onClick={handleSubmit} disabled={loading || isClosedSeason} className="w-full md:w-auto bg-green-600 hover:bg-green-700">
                    <Save size={18} className="me-2" />
                    {loading ? t('common.loading') : t('war.save_declaration')}
                </Button>
            </div>

            {/* Messages */}
            {successMsg && <div className="p-3 bg-green-500/20 border border-green-500/50 text-green-400 rounded text-center animate-in fade-in">{successMsg}</div>}
            {errorMsg && <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-center animate-in fade-in">{errorMsg}</div>}
        </Card>
    );
};

export default AvailabilityForm;