import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CastleTurret, Shield, TrendingUp, Trophy, Skull, Bank, Flag } from './ui/icons';
import { useRole, ROLES } from '../context/RoleContext';

// v2 domain iconography + active gradient pill (maquette M4 : 6 entrées max,
// grille fixe sans scroll — la Course vit dans le Hub KvK, l'Admin dans le drawer)
// leadership: true = réservé King/Officer (BR-009 deadweight)
const NAV_ITEMS = [
    { path: '/', iconComp: CastleTurret, key: 'nav.dashboard' },
    { path: '/war-tracker', iconComp: Shield, key: 'nav.war' },
    { path: '/kvk', iconComp: TrendingUp, key: 'nav.kvk' },
    { path: '/trophies', iconComp: Trophy, key: 'nav.trophies' },
    { path: '/bank', iconComp: Bank, key: 'nav.bank' },
    { path: '/deadweight', iconComp: Skull, key: 'nav.deadweight', leadership: true },
];

const BottomNav = () => {
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const { isAuthorized } = useRole();
    const isLeadership = isAuthorized([ROLES.KING, ROLES.OFFICER]);
    const items = NAV_ITEMS.filter(i => !i.leadership || isLeadership);

    return (
        <nav className="fixed bottom-0 start-0 end-0 z-50 md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-white/10 safe-area-inset-bottom">
            {/* 6 entrées max — grille fixe, aucun scroll (M4) */}
            <div className="flex items-stretch justify-around gap-1 px-1.5 py-1.5">
                {items.map(({ path, iconComp: Icon, key }) => {
                    // Match exact ou sous-route ('/kvk' ne doit pas matcher '/kvk-race')
                    const active = pathname === path || (path !== '/' && pathname.startsWith(path + '/'));
                    return (
                        <Link
                            key={path}
                            to={path}
                            className={`v2-nav-item flex-col !gap-[3px] justify-center flex-1 min-w-0 px-1 min-h-[48px] text-[11px] ${active ? 'act' : ''}`}
                        >
                            {Icon && <Icon size={20} weight={active ? 'fill' : 'regular'} />}
                            <span className="leading-tight truncate w-full text-center">{t(key)}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
