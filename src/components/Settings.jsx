import React, { useRef } from 'react';
import { db, exportToJSON, importFromJSON } from '../db';
import { Globe, Sun, Moon, Download, Upload, Database } from 'lucide-react';
import { translations } from '../translations';

const Settings = ({ language, setLanguage, theme, setTheme }) => {
  const t = translations[language];
  const isDark = theme === 'dark';
  const fileInputRef = useRef(null);

  const handleLanguageChange = async (newLang) => {
    setLanguage(newLang);
    await db.settings.put({ key: 'language', value: newLang });
  };

  const handleThemeToggle = async () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme === 'light' ? 'light' : '');
    await db.settings.put({ key: 'theme', value: newTheme });
  };

  const handleExport = async () => {
    try {
      const json = await exportToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(t.importWarning)) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target.result;
        await importFromJSON(content);
        alert(t.importSuccess);
        window.location.reload(); // Reload to refresh data in all components
      } catch (err) {
        console.error('Import failed:', err);
        alert(t.importError);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="settings-view">
      <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>{t.settings}</h2>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Language */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Globe size={20} color="var(--accent-indigo)" />
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.language}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Elige el idioma de la interfaz.</div>
            </div>
          </div>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', minWidth: '130px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            <option value="en">{t.english}</option>
            <option value="es">{t.spanish}</option>
          </select>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

        {/* Dark / Light Mode */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isDark ? <Moon size={20} color="var(--accent-amber)" /> : <Sun size={20} color="var(--accent-amber)" />}
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{isDark ? t.darkMode : t.lightMode}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{t.themeDesc}</div>
            </div>
          </div>
          <button
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
            style={{
              width: '52px', height: '28px',
              background: isDark ? 'var(--accent-indigo)' : 'var(--text-secondary)',
              borderRadius: '14px',
              border: 'none',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s',
              flexShrink: 0
            }}
          >
            <div style={{
              width: '22px', height: '22px',
              background: 'white',
              borderRadius: '50%',
              position: 'absolute',
              top: '3px',
              left: isDark ? '27px' : '3px',
              transition: 'left 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isDark ? <Moon size={12} color="#6366f1" /> : <Sun size={12} color="#f59e0b" />}
            </div>
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

        {/* Data Management Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Database size={20} color="var(--accent-indigo)" />
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.dataManagement}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Mueve tus datos entre dispositivos.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Export */}
            <button
              onClick={handleExport}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1.25rem',
                background: 'var(--accent-indigo)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Download size={18} />
              {t.exportData}
            </button>

            {/* Import */}
            <button
              onClick={handleImportClick}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1.25rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--border-color)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
            >
              <Upload size={18} />
              {t.importData}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
