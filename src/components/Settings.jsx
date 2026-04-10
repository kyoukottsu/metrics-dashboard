import React from 'react';
import { db } from '../db';
import { Globe, Sun, Moon } from 'lucide-react';
import { translations } from '../translations';

const Settings = ({ language, setLanguage, theme, setTheme }) => {
  const t = translations[language];
  const isDark = theme === 'dark';

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

  return (
    <div className="settings-view">
      <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>{t.settings}</h2>

      <div className="card" style={{ gap: '1.5rem' }}>
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
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', minWidth: '130px' }}
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
          {/* Toggle Switch */}
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
      </div>
    </div>
  );
};

export default Settings;
