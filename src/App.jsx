import { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { LayoutDashboard, Users, Trophy, Wallet, Menu, Swords } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import KvKPerformancePage from './pages/KvKPerformancePage';
import KingdomTrophiesPage from './pages/KingdomTrophiesPage';
import DeadweightPage from './pages/DeadweightPage';
import BankPage from './pages/BankPage';

// Simple placeholders for now
const PlaceHolder = ({ title }) => <div className="p-8 text-2xl font-bold text-center text-muted">{title} Coming Soon</div>;

const Sidebar = ({ isOpen, activePage, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { id: 'kvk', icon: <Swords size={20} />, label: "Performance" },
    { id: 'trophies', icon: <Trophy size={20} />, label: "Trophies" },
    { id: 'deadweight', icon: <Users size={20} />, label: "Deadweight" },
    { id: 'bank', icon: <Wallet size={20} />, label: "Bank" },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 z-50 ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="p-6 flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex-shrink-0" />
        {isOpen && (
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none">Kingdom Manager</h1>
            <span className="text-[10px] text-slate-500 font-mono">v0.1.0</span>
          </div>
        )}
      </div>
      <nav className="px-3 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activePage === item.id
              ? 'bg-primary/20 text-primary border border-primary/20'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            {item.icon}
            {isOpen && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
};

const MainContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const { loading } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-slate-950 text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-slate-400 font-mono">Loading Kingdom Data...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'kvk': return <KvKPerformancePage />;
      case 'trophies': return <KingdomTrophiesPage />;
      case 'deadweight': return <DeadweightPage />;
      case 'bank': return <BankPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1121] text-slate-100 flex">
      <Sidebar
        isOpen={sidebarOpen}
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <header className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-white">Commander</div>
              <div className="text-xs text-primary">Kingdom 2997</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10" />
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <DataProvider>
      <MainContent />
    </DataProvider>
  );
}

export default App;
