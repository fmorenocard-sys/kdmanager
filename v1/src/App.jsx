import { useState } from 'react';
import { LayoutDashboard, Users, Swords, Landmark, Menu } from 'lucide-react';
import DeadweightPage from './pages/DeadweightPage';
import KingdomTrophiesPage from './pages/KingdomTrophiesPage';
import DashboardPage from './pages/DashboardPage';
import BankPage from './pages/BankPage';
import './App.css';

// Minimal Sidebar Component
const Sidebar = ({ isOpen, toggleSidebar, activePage, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { id: 'trophies', icon: <Swords size={20} />, label: "Kingdom Trophies" },
    { id: 'deadweight', icon: <Users size={20} />, label: "Deadweight" },
    { id: 'bank', icon: <Landmark size={20} />, label: "Bank" },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="logo-container">
        <h1 className="logo text-gradient">ROK Dashboard</h1>
      </div>
      <nav>
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'deadweight':
        return <DeadweightPage />;
      case 'trophies':
        return <KingdomTrophiesPage />;
      case 'bank':
        return <BankPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activePage={activePage}
        onNavigate={setActivePage}
      />
      <main className="main-content">
        <header className="top-bar">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-icon">
            <Menu color="var(--text-primary)" />
          </button>
          <div className="user-profile">
            <span className="badge">King</span>
            <span className="username">Admin</span>
          </div>
        </header>
        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
