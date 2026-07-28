import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useRole } from '../context/RoleContext';
import Avatar from '../components/ui/Avatar';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { RefreshCw , User } from '../components/ui/icons';

import PageHeader from '../components/ui/PageHeader';

const ProfilePage = () => {
    const { currentUser, governorId, accounts, claimAccount, unclaimAccount, setAccountType, setPrimaryAccount, linkWithDiscord } = useAuth();
    const { role } = useRole();
    const { players, kvkStats, kvkFillerStats, loading } = useData();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState("");
    const [discordProfile, setDiscordProfile] = useState(null);
    const [syncingRoles, setSyncingRoles] = useState(false);

    const handleForceRoleSync = async () => {
        setSyncingRoles(true);
        try {
            const syncCall = httpsCallable(functions, 'forceRoleSync');
            const result = await syncCall();
            if (result.data.success) {
                alert(`Succès! Votre rôle est maintenant: ${result.data.role}`);
                window.location.reload(); // Reload to refresh contexts
            }
        } catch (error) {
            console.error("Erreur de synchronisation:", error);
            alert("Erreur lors de la synchronisation: " + error.message);
        } finally {
            setSyncingRoles(false);
        }
    };

    useEffect(() => {
        if (currentUser && !currentUser.uid.startsWith('discord:')) {
            getDoc(doc(db, 'user_profiles', currentUser.uid)).then(snap => {
                if (snap.exists() && snap.data().discordId) {
                    setDiscordProfile(snap.data());
                }
            }).catch(err => console.error("Error fetching discord link status", err));
        }
    }, [currentUser]);

    // Roster combiné pour recherche + affichage : Top 300 (players) + fillers et
    // mains KvK — un compte filler n'est PAS dans le Top 300 par construction, il
    // faut donc chercher au-delà (A-022, exigence F-025). Clé = governorId string.
    // Hook : doit précéder les early returns (rules-of-hooks).
    const rosterById = useMemo(() => {
        const map = new Map();
        const add = (id, name, power) => {
            const key = id != null ? String(id) : null;
            if (key && !map.has(key)) map.set(key, { id: key, name: name || key, power });
        };
        (players || []).forEach((p) => add(p.id, p.name, p.power));
        (kvkFillerStats || []).forEach((p) => add(p.id, p.name, p.finalPower ?? p.initialPower));
        (kvkStats || []).forEach((p) => add(p.id, p.name, p.finalPower ?? p.initialPower));
        return map;
    }, [players, kvkStats, kvkFillerStats]);

    if (!currentUser) {
        return (
            <div className="p-8 text-center text-slate-400">
                <p>{t('profile.please_login')}</p>
            </div>
        );
    }

    if (loading) return <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>;

    const handleSearch = (e) => setSearchTerm(e.target.value);

    const claimedIds = new Set(accounts.map((a) => a.governorId));

    // Résultats de recherche : par nom ou ID, hors comptes déjà réclamés.
    const searchResults = searchTerm.length > 2
        ? [...rosterById.values()].filter((p) =>
            !claimedIds.has(p.id) &&
            ((p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || p.id.includes(searchTerm))
        ).slice(0, 10)
        : [];

    const typeLabel = (type) => type === 'filler' ? t('profile.type_filler') : t('profile.type_war');
    const handleClaim = (player, type) => { claimAccount(player.id, type, player.name); setSearchTerm(''); };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="mb-6"><PageHeader icon={User} title={t('profile.title')} /></div>

            {/* Profile Status Card */}
            <div className="v2-glass p-6">
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

                <div className="border-t border-[var(--border-flat)] pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">{t('profile.my_accounts')}</h3>

                    {/* Liste des comptes réclamés (F-025) */}
                    {accounts.length > 0 && (
                        <div className="space-y-2 mb-6">
                            {accounts.map((acc) => {
                                const info = rosterById.get(acc.governorId);
                                const name = info?.name || acc.name || acc.governorId;
                                const isPrimary = String(governorId) === acc.governorId;
                                return (
                                    <div key={acc.governorId} className="bg-slate-700/50 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between border border-[var(--border-flat)] gap-3">
                                        <div className="flex items-center space-x-4 min-w-0">
                                            <Avatar id={acc.governorId} name={name} size="lg" className="border border-slate-500 shrink-0" />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-white font-bold truncate">{name}</p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${acc.type === 'war' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>{typeLabel(acc.type)}</span>
                                                    {isPrimary && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">{t('profile.primary_badge')}</span>}
                                                </div>
                                                <p className="text-xs text-slate-400">ID: {acc.governorId}</p>
                                                {info?.power != null && <p className="text-xs text-slate-500 mt-0.5">Power: {Number(info.power).toLocaleString()}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                                            <button onClick={() => setAccountType(acc.governorId, acc.type === 'war' ? 'filler' : 'war')} className="px-2.5 py-1 text-xs rounded border border-[var(--border-flat)] text-slate-300 hover:brightness-125 transition-colors">
                                                → {acc.type === 'war' ? t('profile.type_filler') : t('profile.type_war')}
                                            </button>
                                            {!isPrimary && (
                                                <button onClick={() => setPrimaryAccount(acc.governorId)} className="px-2.5 py-1 text-xs rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 transition-colors">
                                                    {t('profile.set_primary')}
                                                </button>
                                            )}
                                            <button onClick={() => unclaimAccount(acc.governorId)} className="px-2.5 py-1 text-xs rounded border border-red-500/50 text-red-400 hover:bg-red-500/20 transition-colors">
                                                {t('profile.unlink')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Ajouter un compte */}
                    <div className="v2-glass p-5">
                        <p className="text-slate-300 mb-3 text-sm font-medium">{accounts.length === 0 ? t('profile.no_accounts') : t('profile.add_account')}</p>
                        <div className="relative">
                            <input
                                type="text"
                                aria-label={t('common.search_placeholder')}
                                placeholder={t('common.search_placeholder')}
                                className="w-full bg-[var(--surface-input)] text-[var(--text-primary)] rounded-[10px] min-h-[44px] px-4 py-2 border border-[var(--border-flat)] focus:outline-none focus:ring-2 focus:ring-primary"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                            {searchTerm.length > 0 && searchTerm.length < 3 && (
                                <p className="text-xs text-slate-500 mt-1">{t('common.min_chars')}</p>
                            )}
                        </div>

                        {searchResults.length > 0 && (
                            <div className="mt-4 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                                {searchResults.map((player) => (
                                    <div key={player.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-[var(--surface-solid)] p-3 rounded border border-[var(--border-flat)] gap-2">
                                        <div className="flex items-center space-x-3 text-left min-w-0">
                                            <Avatar id={player.id} name={player.name} size="sm" className="bg-slate-700 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{player.name}</p>
                                                <p className="text-[10px] text-slate-400">{player.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => handleClaim(player, 'war')} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500 transition-colors">
                                                + {t('profile.type_war')}
                                            </button>
                                            <button onClick={() => handleClaim(player, 'filler')} className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-500 transition-colors">
                                                + {t('profile.type_filler')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {searchTerm.length > 2 && searchResults.length === 0 && (
                            <p className="text-slate-500 mt-4 text-sm">{t('common.no_results')}</p>
                        )}
                    </div>
                </div>

                {/* Account Linking Section */}
                <div className="border-t border-[var(--border-flat)] pt-6 mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">{t('profile.linked_accounts', 'Comptes Liés')}</h3>

                    {currentUser.uid?.startsWith("discord:") ? (
                        <div className="bg-[#5865F2]/10 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between border border-[#5865F2]/30 gap-4">
                            <div className="flex items-center space-x-4">
                                <Avatar
                                    src={currentUser.photoURL}
                                    name={currentUser.displayName}
                                    size="lg"
                                    className="border border-[#5865F2]/50"
                                />
                                <div className="text-left">
                                    <p className="text-white font-bold">{currentUser.displayName}</p>
                                    <p className="text-xs text-[#5865F2] font-semibold">{t('profile.connected_via_discord', 'Connecté via Discord SSO')}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 border border-emerald-500/30 rounded">{t('profile.main_account', 'Compte Principal')}</span>
                                <button
                                    onClick={handleForceRoleSync}
                                    disabled={syncingRoles}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--border-flat)] hover:brightness-125 text-slate-300 text-xs rounded border border-[var(--border-flat)] transition-colors disabled:opacity-50"
                                    title={t('profile.sync_roles_desc', 'Forcer la mise à jour de vos permissions depuis le serveur Discord')}
                                >
                                    <RefreshCw size={14} className={syncingRoles ? "animate-spin" : ""} />
                                    {t('profile.sync_roles', 'Synchro Rôles')}
                                </button>
                            </div>
                        </div>
                    ) : discordProfile ? (
                        <div className="bg-slate-700/50 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between border border-[#5865F2]/30 gap-4">
                            <div className="flex items-center space-x-4">
                                <Avatar
                                    src={discordProfile.discordAvatar}
                                    name={discordProfile.discordName}
                                    size="lg"
                                    className="border border-slate-500"
                                />
                                <div className="text-left">
                                    <p className="text-white font-bold">{discordProfile.discordName}</p>
                                    <p className="text-xs text-[#5865F2] font-semibold">{t('profile.discord_linked', 'Discord Lié')}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 border border-emerald-500/30 rounded">{t('profile.linked_account', 'Compte Lié')}</span>
                                <button
                                    onClick={handleForceRoleSync}
                                    disabled={syncingRoles}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--border-flat)] hover:brightness-125 text-slate-300 text-xs rounded border border-[var(--border-flat)] transition-colors disabled:opacity-50"
                                    title={t('profile.sync_roles_desc', 'Forcer la mise à jour de vos permissions depuis le serveur Discord')}
                                >
                                    <RefreshCw size={14} className={syncingRoles ? "animate-spin" : ""} />
                                    {t('profile.sync_roles', 'Synchro Rôles')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="v2-glass p-6 text-center">
                            <p className="text-slate-300 mb-4">{t('profile.link_discord_desc', 'Liez votre compte Discord pour synchroniser vos rôles in-app.')}</p>
                            <button
                                onClick={linkWithDiscord}
                                className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                                </svg>
                                {t('profile.link_discord_account', 'Lier mon compte Discord')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default ProfilePage;
