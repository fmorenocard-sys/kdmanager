
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, Timestamp, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { useRole, ROLES } from '../../context/RoleContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Save, Calendar, Shield, CheckCircle2, ChevronDown, ChevronUp, History, Users, Archive } from '../ui/icons';
import CampaignArchiveControl from './CampaignArchiveControl';

const KvKConfigForm = () => {
    const { role, isAuthorized } = useRole();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [savedConfig, setSavedConfig] = useState(null); // tracks what's actually in Firestore
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        startDate: '',
        endDate: ''
    });
    const [historyOpen, setHistoryOpen] = useState(false);
    const [campaignDeclarationCounts, setCampaignDeclarationCounts] = useState({});

    // Merge & Delete state
    const [availableCampaigns, setAvailableCampaigns] = useState([]);
    
    const [selectedMergeKvkId, setSelectedMergeKvkId] = useState('');
    const [merging, setMerging] = useState(false);

    const [selectedDeleteKvkId, setSelectedDeleteKvkId] = useState('');
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleting, setDeleting] = useState(false);

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
        setMessage('');

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
            setMessage('Active Campaign saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error("Error saving KvK config:", err);
            setMessage('Error saving configuration.');
        }
        setLoading(false);
    };

    const deleteCampaign = async () => {
        const campaign = availableCampaigns.find(c => c.id === selectedDeleteKvkId);
        if (!campaign) return;

        if (deleteConfirmation !== campaign.name) {
            alert('Confirmation text does not match the campaign name.');
            return;
        }

        setDeleting(true);
        try {
            let ops = 0;
            let currentBatch = writeBatch(db);
            const q = query(collection(db, "war_availabilities"), where("kvkId", "==", selectedDeleteKvkId));
            const snapshot = await getDocs(q);

            for (const docData of snapshot.docs) {
                currentBatch.delete(doc(db, "war_availabilities", docData.id));
                ops++;
                if (ops >= 400) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    ops = 0;
                }
            }

            if (ops > 0) {
                await currentBatch.commit();
            }

            alert('Campaign data deleted successfully.');
            setDeleteConfirmation('');
            setSelectedDeleteKvkId('');

            // Refresh list
            const querySnapshot = await getDocs(collection(db, "war_availabilities"));
            const campaignsMap = {};
            querySnapshot.docs.forEach(d => {
                const data = d.data();
                if (data.kvkId && !campaignsMap[data.kvkId]) {
                    campaignsMap[data.kvkId] = { id: data.kvkId, name: data.kvkName || data.kvkId };
                }
            });
            setAvailableCampaigns(Object.values(campaignsMap));
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete campaign: ' + err.message);
        }
        setDeleting(false);
    };

    const mergeCampaign = async () => {
        const sourceCampaign = availableCampaigns.find(c => c.id === selectedMergeKvkId);
        if (!sourceCampaign) return;

        const targetKvkId = formData.id;
        const targetKvkName = formData.name;
        
        if (!targetKvkId) {
            alert('Please save the active campaign configuration first before merging.');
            return;
        }
        if (selectedMergeKvkId === targetKvkId) {
            alert('Cannot merge a campaign into itself.');
            return;
        }

        if (!window.confirm(`Merge all data from "${sourceCampaign.name}" INTO the current Active Campaign "${targetKvkName}"? This will move all declarations over.`)) return;

        setMerging(true);
        try {
            let ops = 0;
            let currentBatch = writeBatch(db);
            const q = query(collection(db, "war_availabilities"), where("kvkId", "==", selectedMergeKvkId));
            const snapshot = await getDocs(q);

            for (const docData of snapshot.docs) {
                const data = docData.data();
                const uid = data.userId !== 'guest' ? data.userId : null;
                const newDocId = uid ? `${targetKvkId}_${uid}` : `${targetKvkId}_guest_${data.governorId}`;
                
                currentBatch.set(doc(db, "war_availabilities", newDocId), {
                    ...data,
                    kvkId: targetKvkId,
                    kvkName: targetKvkName
                });
                currentBatch.delete(doc(db, "war_availabilities", docData.id));
                
                ops += 2;
                if (ops >= 400) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    ops = 0;
                }
            }

            if (ops > 0) {
                await currentBatch.commit();
            }

            alert('Campaign merged successfully!');
            setSelectedMergeKvkId('');
            window.location.reload(); 
        } catch (err) {
            console.error('Merge error:', err);
            alert('Failed to merge campaign: ' + err.message);
        }
        setMerging(false);
    };

    const handleStartNew = (e) => {
        e.preventDefault();
        const newId = `kvk_${Date.now().toString(36)}`;
        setFormData({ id: newId, name: '', startDate: '', endDate: '' });
        setMessage('Ready for a new campaign. Provide details and save.');
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
                    <h2 className="text-lg font-bold">Admin: Active Campaign Configuration</h2>
                </div>
                <p className="text-slate-400 text-sm mb-6">
                    Updating this form modifies the <strong>Active Campaign</strong>. All newly submitted declarations are bound to this campaign's ID. You can freely change the name without losing data.
                </p>

                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="KvK Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. SoC 3: Siege of Orléans"
                        required
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Start Date"
                            name="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={handleChange}
                            leftIcon={<Calendar size={16} />}
                            required
                        />
                        <Input
                            label="End Date"
                            name="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={handleChange}
                            leftIcon={<Calendar size={16} />}
                            required
                        />
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-6 gap-4">
                        <span className={`text-sm w-full text-center md:text-left ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                            {message}
                        </span>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Button type="button" onClick={handleStartNew} variant="outline" className="w-full md:w-auto border-indigo-500/30 hover:bg-indigo-500/10 whitespace-nowrap">
                                Start New
                            </Button>
                            <Button type="submit" disabled={loading} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap text-center justify-center">
                                <Save size={18} className="mr-2 hidden md:inline-block" />
                                Save Active Campaign
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
                            <span className="font-semibold text-slate-300 text-sm">Campaign History</span>
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
                                                    {isActive && <span className="ml-2 text-[10px] font-bold text-green-400 uppercase">Active</span>}
                                                </p>
                                                <p className="text-[10px] font-mono text-slate-500 truncate">{c.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                            <Users size={12} className="text-slate-500" />
                                            <span className="text-xs text-slate-400 font-medium">{count}</span>
                                            <span className="text-[10px] text-slate-600">decl.</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            )}

            {/* Merge Campaign Tool */}
            {availableCampaigns.length > 0 && (
                <Card className="bg-indigo-950/20 border-indigo-500/30 mt-8">
                    <h3 className="text-xl font-bold text-indigo-400 mb-2 flex items-center gap-2">
                        🔄 Recover / Merge Campaign
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                        If data for this campaign was orphaned after a name change, you can select the old campaign name here to merge its data into the newly saved active campaign.
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs text-slate-400 mb-1.5">Select Origin Campaign</label>
                            <select
                                value={selectedMergeKvkId}
                                onChange={(e) => setSelectedMergeKvkId(e.target.value)}
                                className="w-full bg-slate-900/80 border border-[var(--border-flat)] text-slate-200 px-4 py-2 rounded-md font-medium appearance-none outline-none focus:border-indigo-500/50 transition-colors"
                            >
                                <option value="">-- Choose Campaign --</option>
                                {availableCampaigns.map(c => {
                                    if (c.id === formData.id) return null; // Don't allow merging into itself
                                    return (
                                        <option key={c.id} value={c.id} className="bg-[var(--surface-solid)] text-[var(--text-primary)]">
                                            {c.name}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <button
                            onClick={mergeCampaign}
                            disabled={merging || !selectedMergeKvkId}
                            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-bold whitespace-nowrap h-[42px] transition-all text-center"
                        >
                            {merging ? 'Merging...' : 'Merge to Active'}
                        </button>
                    </div>
                </Card>
            )}

            {/* Danger Zone */}
            {availableCampaigns.length > 0 && (
                <Card className="bg-red-950/20 border-red-500/50 mt-8">
                    <h3 className="text-xl font-bold text-red-500 mb-2 flex items-center gap-2">
                        ⚠️ Danger Zone
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                        Permanently delete all availability declarations for a specific historical campaign.
                        <strong className="text-red-400"> This action cannot be undone.</strong>
                    </p>

                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1.5">Select Campaign to Delete</label>
                                <select
                                    value={selectedDeleteKvkId}
                                    onChange={(e) => {
                                        setSelectedDeleteKvkId(e.target.value);
                                        setDeleteConfirmation('');
                                    }}
                                    className="w-full bg-slate-900/80 border border-[var(--border-flat)] text-slate-200 px-4 py-2 rounded-md font-medium appearance-none outline-none focus:border-red-500/50 transition-colors"
                                >
                                    <option value="">-- Choose Campaign --</option>
                                    {availableCampaigns.map(c => (
                                        <option key={c.id} value={c.id} className="bg-[var(--surface-solid)] text-[var(--text-primary)]">
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedDeleteKvkId && (
                            <div className="flex flex-col md:flex-row gap-4 items-end animate-fadeIn">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs text-slate-400 mb-1.5">
                                        Type <strong className="text-white select-all">{availableCampaigns.find(c => c.id === selectedDeleteKvkId)?.name}</strong> to confirm
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-900/80 border border-[var(--border-flat)] rounded-md p-2 text-white outline-none focus:border-red-500/50 transition-colors"
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        placeholder="Campaign Name"
                                    />
                                </div>
                                <button
                                    onClick={deleteCampaign}
                                    disabled={deleting || deleteConfirmation !== availableCampaigns.find(c => c.id === selectedDeleteKvkId)?.name}
                                    className="w-full md:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-bold whitespace-nowrap h-[42px] transition-all text-center"
                                >
                                    {deleting ? 'Deleting...' : 'Delete Campaign'}
                                </button>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* F-015: archive the current KvK performance data into kvk_history */}
            <CampaignArchiveControl />
        </div>
    );
};

export default KvKConfigForm;
