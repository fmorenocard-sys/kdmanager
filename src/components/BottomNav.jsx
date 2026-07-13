import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CastleTurret, Shield, TrendingUp, Trophy, Skull, Bank } from './ui/icons';
import { useRole, ROLES } from '../context/RoleContext';

// v2 domain iconography + active gradient pill (Claude Design v2/components/navigation.html)
const NAV_ITEMS = [
    { path: '/', iconComp: CastleTurret, key: 'nav.dashboard' },
    { path: '/war-tracker', iconComp: Shield, key: 'nav.war' },
    { path: '/kvk', iconComp: TrendingUp, key: 'nav.performance' },
    { path: '/trophies', iconComp: Trophy, key: 'nav.trophies' },
    { path: '/bank', iconComp: Bank, key: 'nav.bank' },
    { path: '/deadweight', iconComp: Skull, key: 'nav.deadweight' },
];

const BottomNav = () => {
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const { isAuthorized } = useRole();
    // BR-009: deadweight is leadership-only
    const items = NAV_ITEMS.filter(i => i.path !== '/deadweight' || isAuthorized([ROLES.KING, ROLES.OFFICER]));

    return (
        <nav className="fixed bottom-0 start-0 end-0 z-50 md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-white/10 safe-area-inset-bottom">
            <div className="flex items-stretch justify-around gap-1 px-1.5 py-1.5">
                {items.map(({ path, iconComp: Icon, key }) => {
                    const active = pathname === path || (path !== '/' && pathname.startsWith(path));
                    return (
                        <Link
                            key={path}
                            to={path}
                            className={`v2-nav-item flex-col !gap-[3px] justify-center flex-1 px-1 min-h-[48px] text-[11px] ${active ? 'act' : ''}`}
                        >
                            <Icon size={20} weight={active ? 'fill' : 'regular'} />
                            <span className="leading-tight truncate w-full text-center">{t(key)}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
