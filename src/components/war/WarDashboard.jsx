import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useRole, ROLES } from '../../context/RoleContext';
import Card from '../ui/Card';
import StatCard from '../ui/StatCard';
import { Database, Swords, Zap, Shield } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/Table';

const WarDashboard = () => {
    const { isAuthorized } = useRole();
    const { t } = useTranslation();
    const [allDeclarations, setAllDeclarations] = useState([]);
    const [selectedKvkId, setSelectedKvkId] = useState('');
    const [availableCampaigns, setAvailableCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [kvkConfig, setKvkConfig] = useState(null);
    const [migrating, setMigrating] = useState(false);

    const authorized = isAuthorized([ROLES.KING, ROLES.OFFICER]);
    const isKing = isAuthorized([ROLES.KING]);

    const getKvKId = (config) => {
        if (!config || !config.name || !config.startDate) return 'default_kvk';
        return `${config.name}_${config.startDate.replace(/-/g, '_')}`.toLowerCase().replace(/\s+/g, '_');
    };

    const fetchData = async () => {
        try {
            // First fetch current KvK config
            const configRef = doc(db, "kvk_config", "current");
            const configSnap = await getDoc(configRef);
            let configData = null;
            let currentKvkId = 'default_kvk';

            if (configSnap.exists()) {
                const data = configSnap.data();
                configData = {
                    name: data.name,
                    startDate: data.startDate ? new Date(data.startDate.seconds * 1000).toISOString().split('T')[0] : '',
                    endDate: data.endDate ? new Date(data.endDate.seconds * 1000).toISOString().split('T')[0] : ''
                };
                setKvkConfig(configData);
                currentKvkId = getKvKId(configData);
            }

            const querySnapshot = await getDocs(collection(db, "war_availabilities"));
            const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            setAllDeclarations(data);

            // Compute unique campaigns
            const campaignsMap = {};
            if (configData) {
                campaignsMap[currentKvkId] = { id: currentKvkId, name: configData.name };
            }
            data.forEach(d => {
                if (d.kvkId && !campaignsMap[d.kvkId]) {
                    campaignsMap[d.kvkId] = { id: d.kvkId, name: d.kvkName || d.kvkId };
                }
            });
            setAvailableCampaigns(Object.values(campaignsMap));

            // Set selected KvK to current by default if not already set
            setSelectedKvkId(prev => prev || currentKvkId);

            setUnmigratedDeclarations(data.filter(d => !d.kvkId));
        } catch (err) {
            console.error("Error fetching war declarations:", err);
        }
        setLoading(false);
    };

    const declarations = useMemo(() => {
        return allDeclarations.filter(d => d.kvkId === selectedKvkId);
    }, [allDeclarations, selectedKvkId]);

    const [unmigratedDeclarations, setUnmigratedDeclarations] = useState([]);

    useEffect(() => {
        if (!authorized) return;
        fetchData();
    }, [authorized]);

    const stats = useMemo(() => {
        return declarations.reduce((acc, curr) => {
            acc.food += (curr.resources?.food || 0);
            acc.wood += (curr.resources?.wood || 0);
            acc.stone += (curr.resources?.stone || 0);
            acc.gold += (curr.resources?.gold || 0);

            acc.universalSpeedups += (curr.speedups?.universal || 0);
            acc.healingSpeedups += (curr.speedups?.healing || 0);
            acc.totalSpeedups += (curr.speedups?.total || curr.speedups?.universal || 0) + (curr.speedups?.healing || 0);

            if (curr.marches && Array.isArray(curr.marches)) {
                curr.marches.forEach(m => {
                    acc.totalMarches++;
                    if (m.type === 'Infantry') acc.infantry++;
                    if (m.type === 'Cavalry') acc.cavalry++;
                    if (m.type === 'Archer') acc.archer++;
                    if (m.type === 'Siege') acc.siege++;
                });
            }

            const tech = curr.crystalTech || 'Unknown';
            acc.tech[tech] = (acc.tech[tech] || 0) + 1;

            return acc;
        }, {
            food: 0, wood: 0, stone: 0, gold: 0,
            totalSpeedups: 0,
            totalMarches: 0, infantry: 0, cavalry: 0, archer: 0, siege: 0,
            tech: {}
        });
    }, [declarations]);

    // ── Migration: Tie old data to CURRENT KvK ──
    const migrateLegacyData = async () => {
        if (!isKing || !kvkConfig) return;
        if (!window.confirm(
            `⚠️ This will tie ${unmigratedDeclarations.length} old declarations to the current active KvK: "${kvkConfig.name}". Proceed?`
        )) return;

        setMigrating(true);
        try {
            const currentKvkId = getKvKId(kvkConfig);
            let operations = 0;
            let batch = writeBatch(db);

            for (const docData of unmigratedDeclarations) {
                const uid = docData.userId !== 'guest' ? docData.userId : null;
                const newDocId = uid ? `${currentKvkId}_${uid}` : `${currentKvkId}_guest_${docData.governorId}`;

                batch.set(doc(db, "war_availabilities", newDocId), {
                    ...docData,
                    kvkId: currentKvkId,
                    kvkName: kvkConfig.name
                });

                batch.delete(doc(db, "war_availabilities", docData.id));

                operations += 2;
                if (operations >= 400) {
                    await batch.commit();
                    batch = writeBatch(db);
                    operations = 0;
                }
            }

            if (operations > 0) {
                await batch.commit();
            }

            alert('Migration complete!');
            await fetchData();
        } catch (err) {
            console.error('Migration error:', err);
            alert('Migration failed: ' + err.message);
        }
        setMigrating(false);
    };


    if (!authorized) return <div className="p-4 text-red-400">{t('common.restricted')}</div>;
    if (loading) return <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>;

    // New data is stored in Billions directly — no division needed
    const formatBillions = (num) => `${(num || 0).toFixed(1)}B`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Shield className="text-blue-500" /> {t('war.dashboard_title')}
                </h2>

                <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm font-medium">Campaign:</span>
                    <select
                        value={selectedKvkId}
                        onChange={(e) => setSelectedKvkId(e.target.value)}
                        className="bg-indigo-900/40 border border-indigo-500/50 text-indigo-200 px-4 py-2 rounded-lg font-bold appearance-none cursor-pointer hover:bg-indigo-800/60 transition-colors shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableCampaigns.map(c => (
                            <option key={c.id} value={c.id} className="bg-slate-800 text-white">
                                {c.name} {kvkConfig && getKvKId(kvkConfig) === c.id ? '(Active)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {isKing && unmigratedDeclarations.length > 0 && kvkConfig && (
                <div className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-lg flex justify-between items-center">
                    <div>
                        <h4 className="text-yellow-400 font-bold flex items-center gap-2">
                            ⚠️ Legacy Declarations Found
                        </h4>
                        <p className="text-slate-300 text-sm mt-1">
                            There are {unmigratedDeclarations.length} records not tied to a specific KvK. Use this button to migrate and attach them to the active KvK ({kvkConfig.name}).
                        </p>
                    </div>
                    <button
                        onClick={migrateLegacyData}
                        disabled={migrating}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50"
                    >
                        {migrating ? 'Migrating...' : 'Migrate Legacy Data'}
                    </button>
                </div>
            )}

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <StatCard title={t('war.total_food')} value={formatBillions(stats.food)} icon={Database} color="amber" />
                <StatCard title={t('war.total_gold')} value={formatBillions(stats.gold)} icon={Database} color="yellow" />
                <StatCard title={t('war.total_marches')} value={stats.totalMarches} icon={Swords} color="red" />
                <StatCard
                    title={t('war.total_speedups')}
                    value={`${stats.totalSpeedups.toFixed(1)}d`}
                    icon={Zap}
                    color="purple"
                />
                <Card className="bg-slate-800 border-slate-700 p-4 flex flex-col justify-center">
                    <h3 className="text-slate-400 text-sm font-semibold mb-2">{t('war.march_distribution')}</h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        <span className="text-blue-400">Inf: {stats.infantry}</span>
                        <span className="text-red-400">Cav: {stats.cavalry}</span>
                        <span className="text-green-400">Arch: {stats.archer}</span>
                        <span className="text-orange-400">Siege: {stats.siege}</span>
                    </div>
                </Card>
            </div>

            {/* Detailed List */}
            <Card className="overflow-hidden border border-slate-700/50 bg-slate-900/40">
                <h3 className="p-4 text-lg font-bold text-white border-b border-slate-800">{t('war.declarations')} ({declarations.length})</h3>
                <div className="overflow-x-auto max-h-[600px] custom-scrollbar">

                    {/* Mobile Card View */}
                    <div className="md:hidden flex flex-col gap-3 p-4">
                        {declarations.map((d) => (
                            <div key={d.id} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex flex-col gap-3">
                                <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-sm truncate max-w-[140px]">{d.governorName}</span>
                                            {d.userId === 'guest' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-600 text-slate-300">Guest</span>}
                                        </div>
                                        <span className="text-[10px] text-slate-500">{d.governorId}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.availability === 'Available' ? 'text-green-400 bg-green-400/10 border border-green-400/20' :
                                            d.availability === 'Partial' ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' :
                                                'text-red-400 bg-red-400/10 border border-red-400/20'
                                        }`}>
                                        {d.availability}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex justify-between bg-slate-900/50 p-1.5 rounded">
                                        <span className="text-slate-500">{t('war.time_utc')}</span>
                                        <span className="font-mono text-slate-300">{d.timeRange || '-'}</span>
                                    </div>
                                    <div className="flex justify-between bg-slate-900/50 p-1.5 rounded">
                                        <span className="text-slate-500">{t('war.tech')}</span>
                                        <span className="font-mono text-slate-300">{d.crystalTech}</span>
                                    </div>
                                    <div className="flex justify-between bg-slate-900/50 p-1.5 rounded">
                                        <span className="text-slate-500">{t('war.marches')}</span>
                                        <span className="font-mono text-slate-300">
                                            {d.marches?.length || 0} <span className="text-slate-500 text-[10px]">({d.marches?.map(m => m.type.substr(0, 1)).join(',')})</span>
                                        </span>
                                    </div>
                                    <div className="col-span-2 flex justify-between bg-slate-900/50 p-1.5 rounded">
                                        <span className="text-slate-500">RSS / SpdU</span>
                                        <span className="font-mono text-amber-400">
                                            {formatBillions((d.resources?.food || 0) + (d.resources?.wood || 0) + (d.resources?.stone || 0) + (d.resources?.gold || 0))}
                                            <span className="text-slate-600 mx-2">|</span>
                                            <span className="text-purple-400">{((d.speedups?.total ?? ((d.speedups?.universal || 0) + (d.speedups?.healing || 0)))).toFixed(1)}d</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {declarations.length === 0 && (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                {t('common.no_results')}
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block w-full min-w-[800px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('dashboard.name')}</TableHead>
                                    <TableHead>{t('war.status')}</TableHead>
                                    <TableHead>{t('war.time_utc')}</TableHead>
                                    <TableHead>{t('war.tech')}</TableHead>
                                    <TableHead>{t('war.marches')}</TableHead>
                                    <TableHead>{t('war.total_rss')}</TableHead>
                                    <TableHead>{t('war.total_speedups')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {declarations.map((d) => (
                                    <TableRow key={d.id} className="hover:bg-white/5">
                                        <TableCell className="font-medium text-white">
                                            {d.governorName} <span className="text-xs text-slate-500">({d.governorId})</span>
                                            {d.userId === 'guest' && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-600 text-slate-300">Guest</span>}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 rounded text-xs ${d.availability === 'Available' ? 'text-green-400 bg-green-900/30' :
                                                d.availability === 'Partial' ? 'text-yellow-400 bg-yellow-900/30' : 'text-red-400 bg-red-900/30'
                                                }`}>
                                                {d.availability}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-300 text-xs">{d.timeRange || '-'}</TableCell>
                                        <TableCell className="text-slate-300 text-xs">{d.crystalTech}</TableCell>
                                        <TableCell className="text-slate-300 text-xs">
                                            {d.marches?.length || 0} <span className="text-slate-500">({d.marches?.map(m => m.type.substr(0, 1)).join(',')})</span>
                                        </TableCell>
                                        <TableCell className="text-amber-400 text-xs font-mono">
                                            {formatBillions((d.resources?.food || 0) + (d.resources?.wood || 0) + (d.resources?.stone || 0) + (d.resources?.gold || 0))}
                                        </TableCell>
                                        <TableCell className="text-purple-400 text-xs font-mono">
                                            {((d.speedups?.total ?? ((d.speedups?.universal || 0) + (d.speedups?.healing || 0)))).toFixed(1)}d
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default WarDashboard;
