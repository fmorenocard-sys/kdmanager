import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Swords, Users, Trophy, Skull, Wallet } from 'lucide-react';

const NAV_ITEMS = [
    { path: '/', iconComp: LayoutDashboard, key: 'nav.dashboard' },
    { path: '/war-tracker', iconComp: Swords, key: 'nav.war' },
    { path: '/kvk', iconComp: Users, key: 'nav.performance' },
    { path: '/trophies', iconComp: Trophy, key: 'nav.trophies' },
    { path: '/bank', iconComp: Wallet, key: 'nav.bank' },
    { path: '/deadweight', iconComp: Skull, key: 'nav.deadweight' },
];

const BottomNav = () => {
    const { pathname } = useLocation();
    const { t } = useTranslation();

    return (
        <nav className="fixed bottom-0 start-0 end-0 z-50 md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-white/10 safe-area-inset-bottom">
            <div className="flex items-stretch justify-around h-16">
                {NAV_ITEMS.map(({ path, iconComp: Icon, key }) => {
                    const active = pathname === path || (path !== '/' && pathname.startsWith(path));
                    return (
                        <Link
                            key={path}
                            to={path}
                            className={`flex flex-col items-center justify-center gap-0.5 flex-1 px-1 text-[10px] font-medium transition-colors ${active
                                ? 'text-indigo-400'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-indigo-500/20' : ''}`}>
                                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                            </div>
                            <span className="leading-tight truncate w-full text-center">{t(key)}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
