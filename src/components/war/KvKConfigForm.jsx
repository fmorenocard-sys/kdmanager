
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, Timestamp, collection, getDocs } from 'firebase/firestore';
import { useRole, ROLES } from '../../context/RoleContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Save, Calendar, Shield, CheckCircle2, ChevronDown, ChevronUp, History, Users, Archive } from '../ui/icons';
// Refonte navigation (M3) : merge/danger zone extraits vers admin/MaintenanceTools,
// CampaignArchiveControl et RaceConfigForm sont composés par la page Administration.

const KvKConfigForm = () => {
    const { role, isAuthorized } = useRole();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [savedConfig, setSavedConfig] = useState(null); // tracks what's actually in Firestore
    const [isError, setIsError] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        startDate: '',
        endDate: ''
    });
    const [historyOpen, setHistoryOpen] = useState(false);
    const [campaignDeclarationCounts, setCampaignDeclarationCounts] = useState({});

    const [availableCampaigns, setAvailableCampaigns] = useState([]);

    const authorized = isAuthorized([ROLES.KING]);

    useEffect(() => {
        const fetchConfig = async () => {
            if (!authorized) return;
            try {
                const docRef = doc(db, "kvk_config", "current");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const startDateStr = data.startDate ? new Date(data.startDate.seconds * 1000).toISOString().split('T')[0] : '';
                    const endDateStr = data.endDate ? new Date(data.endDate.seconds * 1000).toISOString().split('T')[0] : '';
                    const updatedAtStr = data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toLocaleString() : null;
                    const fd = {
                        id: data.id || `${data.name || 'kvk'}_${startDateStr.replace(/-/g, '_')}`.toLowerCase().replace(/\s+/g, '_'),
                        name: data.name || '',
                        startDate: startDateStr,
                        endDate: endDateStr
                    };
                    setFormData(fd);
                    setSavedConfig({
                        ...fd,
                        updatedAt: updatedAtStr,
                        updatedBy: data.updatedBy || null,
                        status: data.status || null // BR-013: 'closed' hors saison
                    });
                }
            } catch (err) {
                console.error("Error loading KvK config:", err);
            }
        };
        const fetchCampaigns = async () => {
            if (!authorized) return;
            try {
                const querySnapshot = await getDocs(collection(db, "war_availabilities"));
                const campaignsMap = {};
                const counts = {};
                querySnapshot.docs.forEach(d => {
                    const data = d.data();
                    if (data.kvkId) {
                        if (!campaignsMap[data.kvkId]) {
                            campaignsMap[data.kvkId] = { id: data.kvkId, name: data.kvkName || data.kvkId };
                            counts[data.kvkId] = 0;
                        }
                        counts[data.kvkId]++;
                    }
                });
                setAvailableCampaigns(Object.values(campaignsMap));
                setCampaignDeclarationCounts(counts);
            } catch (err) {
                console.error("Error fetching campaigns:", err);
            }
        };

        fetchConfig();
        fetchCampaigns();
    }, [authorized]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(''); setIsError(false);

        try {
            const docRef = doc(db, "kvk_config", "current");
            const generatedId = formData.id || `${formData.name}_${formData.startDate.replace(/-/g, '_')}`.toLowerCase().replace(/\s+/g, '_');
            await setDoc(docRef, {
                id: generatedId,
                name: formData.name,
                startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : null,
                endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
                updatedAt: Timestamp.now(),
                updatedBy: role
            });
            setFormData(prev => ({ ...prev, id: generatedId }));
            setSavedConfig({
                ...formData,
                id: generatedId,
                updatedAt: new Date().toLocaleString(),
                updatedBy: role
            });
            setMessage(t('admin.cfg_saved'));
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error("Error saving KvK config:", err);
            setMessage(t('admin.cfg_save_error'));
            setIsError(true);
        }
        setLoading(false);
    };

    const handleStartNew = (e) => {
        e.preventDefault();
        const newId = `kvk_${Date.now().toString(36)}`;
        setFormData({ id: newId, name: '', startDate: '', endDate: '' });
        setMessage(t('admin.cfg_new_ready'));
    };

    if (!authorized) return null;

    return (
        <div className="space-y-6">
            {/* Active Campaign Status Banner — BR-013: reflects the closed (inter-season) state */}
            {savedConfig && (
                <div className={`relative overflow-hidden rounded-xl border p-4 ${savedConfig.status === 'closed'
                    ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-slate-900/80'
                    : 'border-green-500/30 bg-gradient-to-br from-green-950/40 via-slate-900/60 to-slate-900/80'}`}>
                    {/* Glow effect */}
                    {savedConfig.status !== 'closed' && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl rounded-full pointer-events-none" />
                    )}
                    <div className="flex items-start gap-3">
                        <div className={`shrink-0 mt-0.5 p-2 rounded-lg ${savedConfig.status === 'closed'
                            ? 'bg-amber-500/15 ring-1 ring-amber-500/40'
                            : 'bg-green-500/20 ring-1 ring-green-500/40'}`}>
                            {savedConfig.status === 'closed'
                                ? <Archive size={18} className="text-amber-400" />
                                : <CheckCircle2 size={18} className="text-green-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${savedConfig.status === 'closed' ? 'text-amber-400' : 'text-green-400'}`}>
                                {savedConfig.status === 'closed' ? t('war.campaign_closed') : 'Active Campaign — Currently Live'}
                            </p>
                            <h3 className="text-lg font-bold text-white truncate">{savedConfig.name}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                                {savedConfig.startDate && (
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar size={11} className="text-slate-500" />
                                        {new Date(savedConfig.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        {' — '}
                                        {savedConfig.endDate ? new Date(savedConfig.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '...'}
                                    </span>
                                )}
                                <span className="text-xs font-mono text-slate-500 bg-[var(--surface-solid)] px-2 py-0.5 rounded border border-[var(--border-flat)]">
                                    ID: {savedConfig.id}
                                </span>
                            </div>
                            {savedConfig.status === 'closed' && (
                                <p className="text-xs text-slate-400 mt-1.5">{t('war.no_active_campaign')}</p>
                            )}
                            {savedConfig.updatedAt && (
                                <p className="text-[10px] text-slate-500 mt-1.5">
                                    Last saved {savedConfig.updatedAt}{savedConfig.updatedBy ? ` by ${savedConfig.updatedBy}` : ''}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <Card>
                <div className="flex items-center gap-2 mb-2 text-amber-500">
                    <Shield size={20} />
                    <h2 className="text-lg font-bold">{t('admin.cfg_title')}</h2>
                </div>
                <p className="text-slate-400 text-sm mb-6">
                    <Trans i18nKey="admin.cfg_desc" components={[<strong key="0" />]} />
                </p>

                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label={t('admin.cfg_kvk_name')}
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder={t('admin.cfg_kvk_name_ph')}
                        required
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label={t('admin.cfg_start_date')}
                            name="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={handleChange}
                            leftIcon={<Calendar size={16} />}
                            required
                        />
                        <Input
                            label={t('admin.cfg_end_date')}
                            name="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={handleChange}
                            leftIcon={<Calendar size={16} />}
                            required
                        />
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-6 gap-4">
                        <span className={`text-sm w-full text-center md:text-left ${isError ? 'text-red-400' : 'text-green-400'}`}>
                            {message}
                        </span>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Button type="button" onClick={handleStartNew} variant="outline" className="w-full md:w-auto border-indigo-500/30 hover:bg-indigo-500/10 whitespace-nowrap">
                                {t('admin.cfg_start_new')}
                            </Button>
                            <Button type="submit" disabled={loading} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap text-center justify-center">
                                <Save size={18} className="mr-2 hidden md:inline-block" />
                                {t('admin.cfg_save')}
                            </Button>
                        </div>
                    </div>
                </form>
            </Card>

            {/* Campaign History */}
            {availableCampaigns.length > 0 && (
                <Card className="bg-[var(--border-flat)] border-[var(--border-flat)]">
                    <button
                        type="button"
                        onClick={() => setHistoryOpen(h => !h)}
                        className="w-full flex items-center justify-between text-left group"
                    >
                        <div className="flex items-center gap-2">
                            <History size={16} className="text-slate-400" />
                            <span className="font-semibold text-slate-300 text-sm">{t('admin.cfg_history')}</span>
                            <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded-full">{availableCampaigns.length}</span>
                        </div>
                        {historyOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                    </button>

                    {historyOpen && (
                        <div className="mt-4 space-y-2">
                            {availableCampaigns.map(c => {
                                const isActive = savedConfig && c.id === savedConfig.id;
                                const count = campaignDeclarationCounts[c.id] || 0;
                                return (
                                    <div
                                        key={c.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                            isActive
                                                ? 'border-indigo-500/40 bg-indigo-500/10'
                                                : 'border-[var(--border-flat)] bg-slate-900/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${
                                                isActive ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-slate-600'
                                            }`} />
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-300' : 'text-slate-300'}`}>
                                                    {c.name}
                                                    {isActive && <span className="ml-2 text-[10px] font-bold text-green-400 uppercase">{t('admin.cfg_active')}</span>}
                                                </p>
                                                <p className="text-[10px] font-mono text-slate-500 truncate">{c.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                            <Users size={12} className="text-slate-500" />
                                            <span className="text-xs text-slate-400 font-medium">{count}</span>
                                            <span className="text-[10px] text-slate-600">{t('admin.cfg_decl_short')}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            )}

        </div>
    );
};

export default KvKConfigForm;
