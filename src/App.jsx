import { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DataProvider, useData } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';
import { LangProvider } from './context/LangContext';
import { LayoutDashboard, Users, Trophy, Wallet, Menu, Swords, LogIn, LogOut, User, Skull } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import KvKPerformancePage from './pages/KvKPerformancePage';
import KingdomTrophiesPage from './pages/KingdomTrophiesPage';
import DeadweightPage from './pages/DeadweightPage';
import BankPage from './pages/BankPage';
import ProfilePage from './pages/ProfilePage';
import WarTrackerPage from './pages/WarTrackerPage';
import BottomNav from './components/BottomNav';
import LanguageSwitcher from './components/ui/LanguageSwitcher';
import ThemeToggle from './components/ui/ThemeToggle';

const Sidebar = ({ isOpen, onNavigate, onClose }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useTranslation();

  const menuItems = [
    { id: 'dashboard', path: '/', icon: <LayoutDashboard size={20} />, label: t('nav.dashboard') },
    { id: 'war-tracker', path: '/war-tracker', icon: <Swords size={20} />, label: t('nav.war_tracker') },
    { id: 'kvk', path: '/kvk', icon: <Users size={20} />, label: t('nav.performance') },
    { id: 'trophies', path: '/trophies', icon: <Trophy size={20} />, label: t('nav.trophies') },
    { id: 'deadweight', path: '/deadweight', icon: <Skull size={20} />, label: t('nav.deadweight') },
    { id: 'bank', path: '/bank', icon: <Wallet size={20} />, label: t('nav.bank') },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      <aside className={`fixed start-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 z-50 overflow-x-hidden
        ${isOpen ? 'translate-x-0 w-64 shadow-2xl' : 'ltr:-translate-x-full rtl:translate-x-full w-64 ltr:md:translate-x-0 rtl:md:translate-x-0 md:w-20'}
      `}>
        <div className={`flex items-center gap-3 mb-8 transition-all duration-300 ${isOpen ? 'p-6' : 'p-4 justify-center'}`}>
          <img
            src="/logo.png"
            alt="Unitas Logo"
            className={`object-cover rounded-full border-2 border-primary/50 shadow-[0_0_15px_rgba(148,163,184,0.3)] flex-shrink-0 transition-all duration-300 ${isOpen ? 'w-12 h-12' : 'w-10 h-10'}`}
          />
          {isOpen && (
            <div className="animate-in fade-in duration-300">
              <h1 className="font-bold text-base tracking-tight leading-tight">Kingdom Manager<br /><span className="text-primary">Unitas 2997</span></h1>
            </div>
          )}
        </div>
        <nav className="px-3 space-y-2">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
            return (
              <Link
                key={item.id}
                to={item.path}
                aria-label={item.label}
                title={item.label}
                onClick={() => onNavigate && onNavigate()} // Optional: close mobile menu
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${isActive
                  ? 'bg-primary/20 text-primary border border-primary/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                {isOpen && <span className="font-medium truncate whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

const UserProfile = () => {
  const { currentUser, loginWithGoogle, loginWithDiscord, logout } = useAuth();
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!currentUser) {
    return (
      <div className="flex gap-2 animate-in fade-in zoom-in duration-300">
        <button
          onClick={loginWithDiscord}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-[#5865F2] hover:bg-[#4752C4] rounded-lg transition-colors shadow-lg shadow-[#5865F2]/20"
          title="Login with Discord"
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 127.14 96.36" fill="currentColor">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.7,77.7,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.3,46,96.19,53,91.08,65.69,84.69,65.69Z" />
          </svg>
          <span className="hidden sm:inline">Discord</span>
        </button>
        <button
          onClick={loginWithGoogle}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors group"
          title="Login with Google"
        >
          <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs text-black font-extrabold group-hover:scale-110 transition-transform">G</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-right hidden sm:block">
        <div className="text-sm font-bold text-white">{currentUser.displayName}</div>
        <div className="text-xs text-slate-400">{currentUser.email}</div>
      </div>
      <div className="relative">
        {dropdownOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
        )}
        <div className="relative z-50">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold">
                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </button>

          {/* Provider Badge */}
          {currentUser.providerData?.some(p => p.providerId === 'google.com') ? (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center p-0.5 shadow-[0_0_5px_rgba(0,0,0,0.5)] border border-slate-800" title="Google User">
              <span className="w-full h-full rounded-full flex items-center justify-center text-[10px] text-black font-extrabold pb-[1px]">G</span>
            </div>
          ) : currentUser.uid.startsWith('discord:') ? (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#5865F2] rounded-full flex items-center justify-center p-0.5 shadow-[0_0_5px_rgba(0,0,0,0.5)] border border-slate-800" title="Discord User">
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 127.14 96.36" fill="currentColor">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.7,77.7,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.3,46,96.19,53,91.08,65.69,84.69,65.69Z" />
              </svg>
            </div>
          ) : null}
        </div>
        {/* Dropdown Menu */}
        <div className={`absolute end-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl transition-all duration-200 z-50 ${dropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
          <div className="p-2">
            <Link
              to="/profile"
              onClick={() => setDropdownOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-md transition-colors"
            >
              <User size={16} />
              {t('auth.my_profile')}
            </Link>
            <button
              onClick={() => { setDropdownOpen(false); logout(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors"
            >
              <LogOut size={16} />
              {t('auth.sign_out')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MainContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { loading: dataLoading } = useData();
  const { loading: authLoading } = useAuth(); // Wait for auth check

  if (dataLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-slate-950 text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-slate-400 font-mono">Loading Kingdom Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1121] text-slate-100 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={() => window.innerWidth < 768 && setSidebarOpen(false)}
      />

      <main className={`flex-1 transition-all duration-300 ms-0 ${sidebarOpen ? 'md:ms-64' : 'md:ms-20'} min-h-screen flex flex-col min-w-0`}>
        <header className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6 min-w-0">
          {/* Hamburger — desktop only */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          {/* Logo placeholder on mobile */}
          <div className="md:hidden flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full border border-primary/40" />
            <span className="font-semibold text-sm text-white">KD Manager</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <UserProfile />
          </div>
        </header>

        <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col p-4 md:p-6 lg:p-10 pb-24 md:pb-6 lg:pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 min-w-0">
          <div className="flex-1 min-w-0">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/kvk" element={<KvKPerformancePage />} />
              <Route path="/war-tracker" element={<WarTrackerPage />} />
              <Route path="/trophies" element={<KingdomTrophiesPage />} />
              <Route path="/deadweight" element={<DeadweightPage />} />
              <Route path="/bank" element={<BankPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          <footer className="mt-12 pt-6 border-t border-white/10 text-center flex flex-col items-center justify-center gap-2 opacity-80">
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} Kingdom Manager &bull; Unitas 2997. All rights reserved.
            </p>
            <p className="text-xs text-slate-500">
              Designed & Developed for Kingdom 2997
            </p>
          </footer>
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}



function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <RoleProvider>
          <DataProvider>
            <LangProvider>
              <MainContent />
            </LangProvider>
          </DataProvider>
        </RoleProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
