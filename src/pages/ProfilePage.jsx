import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useRole } from '../context/RoleContext';
import Avatar from '../components/ui/Avatar';

const ProfilePage = () => {
    const { currentUser, governorId, linkGovernor, unlinkGovernor } = useAuth();
    const { role } = useRole();
    const { players, loading } = useData();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState("");

    if (!currentUser) {
        return (
            <div className="p-8 text-center text-slate-400">
                <p>{t('profile.please_login')}</p>
            </div>
        );
    }

    if (loading) return <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>;

    const linkedPlayer = governorId ? players.find(p => String(p.id) === String(governorId)) : null;

    const handleSearch = (e) => setSearchTerm(e.target.value);

    // Filter players for search
    const filteredPlayers = searchTerm.length > 2
        ? players.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(p.id).includes(searchTerm)
        ).slice(0, 10) // Limit results
        : [];

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white mb-6">{t('profile.title')}</h1>

            {/* Profile Status Card */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-lg">
                <div className="flex items-center space-x-4 mb-6">
                    <Avatar
                        src={currentUser.photoURL}
                        name={currentUser.displayName}
                        size="xl"
                        showRing={true}
                        ringColor="border-indigo-500"
                    />

                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white">{currentUser.displayName}</h2>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${role === 'King' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                role === 'Officer' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                    role === 'Warrior' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                        'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                }`}>
                                {role}
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm">
                            {currentUser.email || (currentUser.uid?.startsWith("discord:") ? "Via Discord SSO" : "Guest")}
                        </p>
                    </div>
                </div>

                <div className="border-t border-slate-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">{t('profile.linked_governor')}</h3>

                    {linkedPlayer ? (
                        <div className="bg-slate-700/50 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between border border-green-500/30 gap-4 md:gap-0">
                            <div className="flex items-center space-x-4 w-full md:w-auto">
                                <Avatar
                                    id={linkedPlayer.id}
                                    name={linkedPlayer.name}
                                    size="lg"
                                    className="border border-slate-500"
                                />
                                <div>
                                    <p className="text-white font-bold">{linkedPlayer.name}</p>
                                    <p className="text-xs text-slate-400">ID: {linkedPlayer.id}</p>
                                    <p className="text-xs text-indigo-400 mt-1">Power: {parseInt(linkedPlayer.power).toLocaleString()}</p>
                                </div>
                            </div>
                            <button
                                onClick={unlinkGovernor}
                                className="w-full md:w-auto px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded hover:bg-red-500/30 transition-colors border border-red-500/50"
                            >
                                {t('profile.unlink')}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700 text-center">
                            <p className="text-slate-300 mb-4">{t('profile.no_governor_linked')}</p>

                            <div className="max-w-md mx-auto relative">
                                <input
                                    type="text"
                                    placeholder={t('common.search_placeholder')}
                                    className="w-full bg-slate-800 text-white rounded px-4 py-2 border border-slate-600 focus:outline-none focus:border-indigo-500"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                {searchTerm.length > 0 && searchTerm.length < 3 && (
                                    <p className="text-xs text-slate-500 mt-1 absolute left-0 -bottom-5">{t('common.min_chars')}</p>
                                )}
                            </div>

                            {/* Search Results */}
                            {filteredPlayers.length > 0 && (
                                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {filteredPlayers.map(player => (
                                        <div key={player.id} className="flex items-center justify-between bg-slate-800 p-3 rounded border border-slate-700 hover:border-indigo-500/50 transition-colors">
                                            <div className="flex items-center space-x-3 text-left">
                                                <Avatar
                                                    id={player.id}
                                                    name={player.name}
                                                    size="sm"
                                                    className="bg-slate-700"
                                                />
                                                <div>
                                                    <p className="text-sm font-bold text-white">{player.name}</p>
                                                    <p className="text-[10px] text-slate-400">{player.id}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => linkGovernor(player.id)}
                                                className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500 transition-colors"
                                            >
                                                {t('profile.claim')}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {searchTerm.length > 2 && filteredPlayers.length === 0 && (
                                <p className="text-slate-500 mt-4 text-sm">{t('common.no_results')}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
