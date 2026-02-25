
import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, Timestamp, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { useRole, ROLES } from '../../context/RoleContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { Save, Calendar, Shield } from 'lucide-react';

const KvKConfigForm = () => {
    const { role, isAuthorized } = useRole();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: ''
    });

    // Danger Zone state
    const [availableCampaigns, setAvailableCampaigns] = useState([]);
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
                    setFormData({
                        name: data.name || '',
                        startDate: data.startDate ? new Date(data.startDate.seconds * 1000).toISOString().split('T')[0] : '',
                        endDate: data.endDate ? new Date(data.endDate.seconds * 1000).toISOString().split('T')[0] : ''
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
                querySnapshot.docs.forEach(d => {
                    const data = d.data();
                    if (data.kvkId && !campaignsMap[data.kvkId]) {
                        campaignsMap[data.kvkId] = { id: data.kvkId, name: data.kvkName || data.kvkId };
                    }
                });
                setAvailableCampaigns(Object.values(campaignsMap));
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
            await setDoc(docRef, {
                name: formData.name,
                startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : null,
                endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
                updatedAt: Timestamp.now(),
                updatedBy: role
            });
            setMessage('Active Campaign set successfully!');
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

    if (!authorized) return null;

    return (
        <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
                <div className="flex items-center gap-2 mb-2 text-amber-500">
                    <Shield size={20} />
                    <h2 className="text-lg font-bold">Admin: KvK Configuration</h2>
                </div>
                <p className="text-slate-400 text-sm mb-6">
                    Updating this form sets the <strong>Active Campaign</strong>. All new availability declarations will be tied to this campaign. Your historical campaigns remain accessible on the War Dashboard.
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
                        <Button type="submit" disabled={loading} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap text-center justify-center">
                            <Save size={18} className="mr-2 hidden md:inline-block" />
                            Set as Active Campaign
                        </Button>
                    </div>
                </form>
            </Card>

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
                                    className="w-full bg-slate-900/80 border border-slate-700/80 text-slate-200 px-4 py-2 rounded-md font-medium appearance-none outline-none focus:border-red-500/50 transition-colors"
                                >
                                    <option value="">-- Choose Campaign --</option>
                                    {availableCampaigns.map(c => (
                                        <option key={c.id} value={c.id} className="bg-slate-800 text-white">
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
                                        className="w-full bg-slate-900/80 border border-slate-700/80 rounded-md p-2 text-white outline-none focus:border-red-500/50 transition-colors"
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

export default KvKConfigForm;
