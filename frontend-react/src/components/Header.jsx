import React, { useState, useEffect } from 'react';
import { Bell, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Header({
  onOpenEmergency,
  onOpenAlertsModal,
}) {
  const [alertCount, setAlertCount] = useState(2);
  const { currentLang, setLanguage, languages, t } = useLanguage();

  useEffect(() => {
    // Fetch active alert count from backend API
    fetch('/api/alerts/active')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.alerts) {
          setAlertCount(data.alerts.length);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="orca-header">
      <div className="header-brand">
        <div className="brand-logo-wrap">
          <svg className="brand-svg" viewBox="0 0 32 32" fill="none">
            <path
              d="M4 16C4 10 10 6 18 6C24 6 28 9 28 13C28 15 26 16.5 24 16.5C21 16.5 19 14.5 16 14.5C12 14.5 10 17 8 19C7 20 5.5 21 4 21C4 19 4 17.5 4 16Z"
              fill="#0369a1"
            />
            <circle cx="10" cy="12" r="1.5" fill="#38bdf8" />
            <path
              d="M18 19C16 19 14.5 20.5 13 22C11.5 23.5 10 24.5 7 24.5C8.5 25.5 11 26 14 26C20 26 25 22 26 18.5C24.5 19 21.5 19 18 19Z"
              fill="#0284c7"
            />
          </svg>
        </div>
        <div className="brand-text">
          <span className="brand-title">{t('appTitle', 'ORCA')}</span>
          <span className="brand-sub">{t('appSubtitle', 'Autonomous Ocean Intelligence & Navigation')}</span>
        </div>
      </div>

      <div className="header-actions">
        {/* Global Language Selector (Beside Alert Notification) */}
        <div className="header-lang-picker" title={t('selectLanguage', 'Select Language')}>
          <Globe size={16} className="header-lang-icon" />
          <span className="header-lang-label">LANG:</span>
          <select
            id="orca-header-lang-select"
            className="header-lang-select"
            value={currentLang}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={t('selectLanguage', 'Select Language')}
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag || '🌐'} {lang.native} ({lang.label})
              </option>
            ))}
          </select>
        </div>

        {/* Alerts Bell */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={onOpenAlertsModal}
          title={t('alertsTooltip', 'Active Maritime Advisories')}
        >
          <Bell size={18} />
          {alertCount > 0 && <span className="badge-count">{alertCount}</span>}
        </button>
      </div>
    </header>
  );
}
