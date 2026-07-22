import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { doc, getDoc, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { useRole, ROLES } from '../../context/RoleContext';
import Card from '../ui/Card';

// Refonte navigation (M3) — section « Maintenance » de la page Administration.
// Outils extraits de KvKConfigForm : fusion de campagnes orphelines et danger
// zone (suppression des déclarations d'une campagne). Roi uniquement.
const MaintenanceTools = () => {
    const { t } = useTranslation();
    const { isAuthorized } = useRole();
    const authorized = isAuthorized([ROLES.KING]);

    const [target, setTarget] = useState(null); // { id, name } — campagne active (kvk_config)
    const [availableCampaigns, setAvailableCampaigns] = useState([]);
    const [campaignDeclarationCounts, setCampaignDeclarationCounts] = useState({});
    const [selectedMergeKvkId, setSelectedMergeKvkId] = useState('');
    const [merging, setMerging] = useState(false);
    const [selectedDeleteKvkId, setSelectedDeleteKvkId] = useState('');
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!authorized) return;
        getDoc(doc(db, 'kvk_config', 'current')).then((snap) => {
            if (snap.exists()) setTarget({ id: snap.data().id, name: snap.data().name });
        }).catch((err) => console.error('kvk_config read error:', err));

        getDocs(collection(db, 'war_availabilities')).then((querySnapshot) => {
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
        }).catch((err) => console.error('war_availabilities read error:', err));
    }, [authorized]);

    if (!authorized) return null;

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
            const q = query(collection(db, 'war_availabilities'), where('kvkId', '==', selectedDeleteKvkId));
            const snapshot = await getDocs(q);
            for (const docData of snapshot.docs) {
                currentBatch.delete(doc(db, 'war_availabilities', docData.id));
                ops++;
                if (ops >= 400) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    ops = 0;
                }
            }
            if (ops > 0) await currentBatch.commit();
            alert('Campaign data deleted successfully.');
            setDeleteConfirmation('');
            setSelectedDeleteKvkId('');
            setAvailableCampaigns(prev => prev.filter(c => c.id !== selectedDeleteKvkId));
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete campaign: ' + err.message);
        }
        setDeleting(false);
    };

    const mergeCampaign = async () => {
        const sourceCampaign = availableCampaigns.find(c => c.id === selectedMergeKvkId);
        if (!sourceCampaign || !target?.id) {
            alert('Save the active campaign configuration first before merging.');
            return;
        }
        if (selectedMergeKvkId === target.id) {
            alert('Cannot merge a campaign into itself.');
            return;
        }
        if (!window.confirm(`Merge all data from "${sourceCampaign.name}" INTO the current Active Campaign "${target.name}"? This will move all declarations over.`)) return;
        setMerging(true);
        try {
            let ops = 0;
            let currentBatch = writeBatch(db);
            const q = query(collection(db, 'war_availabilities'), where('kvkId', '==', selectedMergeKvkId));
            const snapshot = await getDocs(q);
            for (const docData of snapshot.docs) {
                const data = docData.data();
                const uid = data.userId !== 'guest' ? data.userId : null;
                const newDocId = uid ? `${target.id}_${uid}` : `${target.id}_guest_${data.governorId}`;
                currentBatch.set(doc(db, 'war_availabilities', newDocId), {
                    ...data,
                    kvkId: target.id,
                    kvkName: target.name
                });
                currentBatch.delete(doc(db, 'war_availabilities', docData.id));
                ops += 2;
                if (ops >= 400) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                    ops = 0;
                }
            }
            if (ops > 0) await currentBatch.commit();
            alert('Campaign merged successfully!');
            setSelectedMergeKvkId('');
            window.location.reload();
        } catch (err) {
            console.error('Merge error:', err);
            alert('Failed to merge campaign: ' + err.message);
        }
        setMerging(false);
    };

    return (
        <div className="space-y-6">
            <p className="text-sm text-slate-400">{t('admin.maintenance_desc')}</p>

            {/* Merge Campaign Tool */}
            {availableCampaigns.length > 0 && (
                <Card className="bg-indigo-950/20 border-indigo-500/30">
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
                                    if (c.id === target?.id) return null;
                                    return (
                                        <option key={c.id} value={c.id} className="bg-[var(--surface-solid)] text-[var(--text-primary)]">
                                            {c.name} ({campaignDeclarationCounts[c.id] || 0} decl.)
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
                <Card className="bg-red-950/20 border-red-500/50">
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
        </div>
    );
};

export default MaintenanceTools;
