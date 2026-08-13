
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useRole, ROLES } from '../../context/RoleContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import AccessGate from '../ui/AccessGate';
import CommanderSelector from './CommanderSelector';
import CommanderAvatar from './CommanderAvatar';
import ActiveHoursPickerUTC from './ActiveHoursPickerUTC';
import FillerDeclarationBlock from './FillerDeclarationBlock';
import { COMMANDERS } from '../../data/commanders';
import { Save, User, Database, Swords, Zap, X, Calendar } from '../ui/icons';

const AvailabilityForm = () => {
    const { currentUser, governorId, accounts, linkGovernor } = useAuth();

    const { players } = useData();
    const { isAuthorized } = useRole();
    const { t, i18n } = useTranslation();

    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [kvkConfig, setKvkConfig] = useState(null);

    // E-007/F-026 : déclaration par compte. On distingue comptes de guerre (form
    // complet) et fillers (bloc dédié). `selectedGovernorId` = le compte de guerre
    // actuellement édité par le formulaire complet.
    const warAccounts = accounts.filter((a) => a.type === 'war');
    const fillerAccounts = accounts.filter((a) => a.type === 'filler');
    const [selectedGovernorId, setSelectedGovernorId] = useState(null);

    // Nom live par id (donnée synchro), repli sur le nom stocké dans le compte.
    const resolveName = (gid) => {
        const p = players.find((x) => String(x.id) === String(gid));
        if (p?.name) return p.name;
        const acc = accounts.find((a) => String(a.governorId) === String(gid));
        return acc?.name || String(gid);
    };

    // Défaut du compte édité : le primaire s'il est 'war', sinon le 1er compte war.
    useEffect(() => {
        const warIds = warAccounts.map((a) => String(a.governorId));
        if (selectedGovernorId && warIds.includes(selectedGovernorId)) return;
        const primary = String(governorId || '');
        // primaire s'il est 'war', sinon 1er compte war ; null si aucun compte war
        // (l'utilisateur pur-filler / sans compte utilise la saisie manuelle ou le bloc filler).
        setSelectedGovernorId(warIds.includes(primary) ? primary : (warIds[0] || null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accounts, governorId]);

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
                        startDateMs: data.startDate ? data.startDate.seconds * 1000 : null, // BR-022 : gel au démarrage
                        endDate: endDateStr,
                        status: data.status || null // BR-013: 'closed' hors saison
                    };
                    setKvkConfig(configData);
                    currentKvkId = data.id || `${configData.name}_${configData.startDate.replace(/-/g, '_')}`.toLowerCase().replace(/\s+/g, '_');
                }

                // F-026 : déclaration du COMPTE sélectionné. On réinitialise d'abord
                // le formulaire (pour ne pas traîner les données du compte précédent
                // lors d'un switch), puis on charge sa déclaration.
                if (currentUser && selectedGovernorId != null) {
                    const gid = String(selectedGovernorId);
                    setFormData({
                        governorName: resolveName(gid),
                        governorId: gid,
                        availability: 'Available',
                        crystalTech: 'Low',
                        activeHoursUTC: { from: '', to: '' },
                        resources: { food: 0, wood: 0, stone: 0, gold: 0 },
                        speedups: { total: 0 },
                        marches: [],
                    });
                    // docId 3 segments ; repli lecture sur l'ancien 2 segments si
                    // c'est le compte primaire (migration option A, spec §7.2).
                    let sn = await getDoc(doc(db, "war_availabilities", `${currentKvkId}_${currentUser.uid}_${gid}`));
                    if (!sn.exists() && gid === String(governorId)) {
                        sn = await getDoc(doc(db, "war_availabilities", `${currentKvkId}_${currentUser.uid}`));
                    }
                    if (sn.exists()) {
                        const data = sn.data();
                        setFormData(prev => ({
                            ...prev,
                            ...data,
                            governorId: gid,
                            governorName: resolveName(gid),
                            activeHoursUTC: data.activeHoursUTC || { from: '', to: '' },
                        }));
                    }
                }
            } catch (e) {
                console.log("Error fetching config or declaration", e);
            }
        };

        fetchConfigAndData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, selectedGovernorId]);

    // Gel des déclarations : BR-013 (saison close, tout le monde) + BR-022 (campagne
    // démarrée, tout le monde SAUF le Roi/admin qui peut corriger). Défense en profondeur —
    // /me masque déjà le formulaire aux non-admin une fois la campagne démarrée.
    const isClosedSeason = kvkConfig?.status === 'closed';
    const campaignStarted = kvkConfig?.startDateMs != null && kvkConfig.startDateMs <= Date.now();
    const isAdmin = isAuthorized([ROLES.KING]);
    const declarationsLocked = isClosedSeason || (campaignStarted && !isAdmin);
    const activeKvkId = kvkConfig
        ? (kvkConfig.id || `${kvkConfig.name}_${kvkConfig.startDate.replace(/-/g, '_')}`.toLowerCase().replace(/\s+/g, '_'))
        : 'default_kvk';

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
        // Soupape : seul le TYPE de marche est requis. Les commandants sont un
        // enrichissement optionnel — un commandant pas encore présent au référentiel
        // ne doit jamais bloquer une déclaration (le pairing exact n'est pas exploité
        // aujourd'hui ; réservé à une future analyse « marches méta »).
        if (!marchInput.type) return;
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
        if (declarationsLocked) return; // BR-013 (saison close) / BR-022 (campagne démarrée)
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        if (!formData.governorName || !formData.governorId) {
            setErrorMsg(t('war.form_required'));
            setLoading(false);
            return;
        }

        try {
            // Auto-link seulement si le compte n'est PAS déjà réclamé (cas saisie
            // manuelle d'un utilisateur sans compte). Déclarer pour un compte de
            // guerre déjà réclamé ne doit PAS repointer le compte primaire.
            if (currentUser && formData.governorId
                && !accounts.some((a) => String(a.governorId) === String(formData.governorId))) {
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

            // F-026 : docId 3 segments par compte pour un utilisateur connecté ;
            // invité inchangé (2 segments guest).
            const docId = currentUser
                ? `${localKvkId}_${currentUser.uid}_${formData.governorId}`
                : `${localKvkId}_guest_${formData.governorId}`;

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
                accountType: 'war',
                resources: sanitizedResources,
                speedups: sanitizedSpeedups,
                activeHoursUTC: sanitizedActiveHours,
                userId: currentUser ? currentUser.uid : 'guest',
                kvkId: localKvkId,
                kvkName: kvkName || 'Unknown',
                updatedAt: Timestamp.now()
            });

            // Anti-doublon : si on vient d'écrire le compte primaire en 3 segments,
            // on supprime son ancien doc 2 segments (migration option A au fil de
            // l'eau — évite qu'il apparaisse deux fois dans le War Dashboard).
            if (currentUser && String(formData.governorId) === String(governorId)) {
                try { await deleteDoc(doc(db, "war_availabilities", `${localKvkId}_${currentUser.uid}`)); }
                catch { /* pas d'ancien doc : rien à faire */ }
            }

            setSuccessMsg(t('war.submit_success'));
        } catch (err) {
            console.error("Error saving:", err);
            setErrorMsg(t('war.submit_error'));
        }
        setLoading(false);
    };

    const getCmdImage = (id) => COMMANDERS.find(c => c.id === id)?.image || null;
    const getCmdName = (id) => COMMANDERS.find(c => c.id === id)?.name || id;

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

                {/* BR-022 : campagne démarrée et utilisateur non-admin → déclarations gelées. */}
                {campaignStarted && !isAdmin && !isClosedSeason && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center gap-3">
                        <Calendar size={20} className="text-amber-400 shrink-0" />
                        <p className="text-sm text-amber-200">{t('war.declarations_frozen')}</p>
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
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">{t('war.active_campaign')}</span>
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

            {/* Sélecteur de comptes de guerre (F-026) — n'apparaît qu'avec plusieurs */}
            {warAccounts.length > 1 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label={t('war.account_selector')}>
                    {warAccounts.map((acc) => {
                        const gid = String(acc.governorId);
                        const active = gid === String(selectedGovernorId);
                        return (
                            <button
                                key={gid}
                                type="button"
                                onClick={() => setSelectedGovernorId(gid)}
                                className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${active ? 'text-indigo-300 bg-indigo-500/15 border-indigo-500/40' : 'text-slate-400 bg-[var(--border-flat)] border-[var(--border-flat)] hover:text-slate-200'}`}
                            >
                                {resolveName(gid)}
                            </button>
                        );
                    })}
                </div>
            )}

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
                        <option value="F2P">{t('war.crystal_f2p')}</option>
                        <option value="Low">{t('war.crystal_low')}</option>
                        <option value="Mid">{t('war.crystal_mid')}</option>
                        <option value="High">{t('war.crystal_high')}</option>
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
                    <Input label={t('war.food')} name="food" type="number" value={formData.resources.food === 0 ? '' : formData.resources.food} onChange={handleResourceChange} placeholder={t('war.example', { v: '5.2' })} />
                    <Input label={t('war.wood')} name="wood" type="number" value={formData.resources.wood === 0 ? '' : formData.resources.wood} onChange={handleResourceChange} placeholder={t('war.example', { v: '3.1' })} />
                    <Input label={t('war.stone')} name="stone" type="number" value={formData.resources.stone === 0 ? '' : formData.resources.stone} onChange={handleResourceChange} placeholder={t('war.example', { v: '2.5' })} />
                    <Input label={t('war.gold')} name="gold" type="number" value={formData.resources.gold === 0 ? '' : formData.resources.gold} onChange={handleResourceChange} placeholder={t('war.example', { v: '1.0' })} />
                </div>
            </div>

            {/* Speedups */}
            <div className="bg-[var(--border-flat)] p-3 md:p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    <Zap size={18} /> {t('war.speedups')}
                </h3>
                <Input
                    label={t('war.speedups_total_label')}
                    name="total"
                    type="number"
                    value={(formData.speedups?.total === 0 || formData.speedups?.total === undefined) ? '' : formData.speedups.total}
                    onChange={handleSpeedupChange}
                    placeholder={t('war.speedups_placeholder')}
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

                                {(m.primary || m.secondary) ? (
                                    <>
                                        <div className="flex items-center gap-[-10px]">
                                            {m.primary && <CommanderAvatar image={getCmdImage(m.primary)} name={getCmdName(m.primary)} size={32} className="w-8 h-8 rounded-full border-2 border-[var(--border-flat)] z-10" />}
                                            {m.secondary && <CommanderAvatar image={getCmdImage(m.secondary)} name={getCmdName(m.secondary)} size={32} className="w-8 h-8 rounded-full border-2 border-[var(--border-flat)] -ms-3 z-0" />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            {m.primary && <span className="text-sm font-medium text-slate-200 truncate">{getCmdName(m.primary)}</span>}
                                            {m.secondary && <span className="text-xs text-slate-400 truncate">+ {getCmdName(m.secondary)}</span>}
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-xs text-slate-500 italic">{t('war.commanders_unspecified')}</span>
                                )}
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
                        <Button onClick={addMarch} disabled={!marchInput.type} className="w-full h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-lg transition-all active:scale-95 text-sm font-medium">
                            {t('war.add_march')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4">
                <Button onClick={handleSubmit} disabled={loading || declarationsLocked} className="w-full md:w-auto bg-green-600 hover:bg-green-700">
                    <Save size={18} className="me-2" />
                    {loading ? t('common.loading') : t('war.save_declaration')}
                </Button>
            </div>

            {/* Messages */}
            {successMsg && <div className="p-3 bg-green-500/20 border border-green-500/50 text-green-400 rounded text-center animate-in fade-in">{successMsg}</div>}
            {errorMsg && <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-center animate-in fade-in">{errorMsg}</div>}

            {/* Déclaration filler (F-026) — comptes de type filler uniquement */}
            {fillerAccounts.length > 0 && (
                <FillerDeclarationBlock
                    fillerAccounts={fillerAccounts}
                    uid={currentUser.uid}
                    kvkId={activeKvkId}
                    kvkName={kvkConfig?.name}
                    resolveName={resolveName}
                    disabled={declarationsLocked}
                />
            )}
        </Card>
    );
};

export default AvailabilityForm;