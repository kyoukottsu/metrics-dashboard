import React, { useState, useEffect } from 'react'
import { LayoutDashboard, Target, Activity, Settings as SettingsIcon, Plus, ClipboardList, History } from 'lucide-react'
import Dashboard from './components/Dashboard'
import GoalsConfig from './components/GoalsConfig'
import AddDataModal from './components/AddDataModal'
import Settings from './components/Settings'
import InventoryTracker from './components/InventoryTracker'
import RecordsList from './components/RecordsList'
import { seedDatabase, db } from './db'
import { translations } from './translations'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [selectedGoalIdForModal, setSelectedGoalIdForModal] = useState(null);

  useEffect(() => {
    seedDatabase();
    
    const loadSettings = async () => {
      const [langSetting, themeSetting] = await Promise.all([
        db.settings.get('language'),
        db.settings.get('theme'),
      ]);
      if (langSetting) setLanguage(langSetting.value);
      if (themeSetting) {
        const t = themeSetting.value || 'dark';
        setTheme(t);
        document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '');
      }
    };
    loadSettings();
  }, []);

  const t = translations[language];

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Activity size={30} color="var(--accent-indigo)" />
          <span>MetricFlow</span>
        </div>
        
        <nav className="nav-links">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} />
            <span>{t.dashboard}</span>
          </button>
          
          <button className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>
            <Target size={20} />
            <span>{t.goals}</span>
          </button>

          <button className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            <ClipboardList size={20} />
            <span>{t.inventory}</span>
          </button>
          
          <button className={`nav-item ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>
            <History size={20} />
            <span>{t.records || 'Registros'}</span>
          </button>
          
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <SettingsIcon size={20} />
            <span>{t.settings}</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="content">
        {activeTab === 'dashboard' && (
          <Dashboard 
            language={language} 
            onAddData={(id) => { setSelectedGoalIdForModal(id); setIsModalOpen(true); }}
          />
        )}
        {activeTab === 'goals' && <GoalsConfig language={language} />}
        {activeTab === 'inventory' && <InventoryTracker language={language} />}
        {activeTab === 'records' && <RecordsList language={language} />}
        {activeTab === 'settings' && (
          <Settings
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            setTheme={setTheme}
          />
        )}

        {isModalOpen && (
          <AddDataModal 
            onClose={() => { setIsModalOpen(false); setSelectedGoalIdForModal(null); }} 
            language={language}
            initialGoalId={selectedGoalIdForModal}
          />
        )}
      </main>
    </div>
  )
}

export default App
