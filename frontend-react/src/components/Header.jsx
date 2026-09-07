import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert } from 'lucide-react';

export default function Header({
  onOpenEmergency,
  onOpenAlertsModal,
}) {
  const [alertCount, setAlertCount] = useState(2);

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
          <span className="brand-title">ORCA</span>
          <span className="brand-sub">Autonomous Ocean Intelligence & Navigation</span>
        </div>
      </div>

      <div className="header-actions">
        {/* Alerts Bell */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={onOpenAlertsModal}
          title="Active Maritime Advisories"
        >
          <Bell size={18} />
          {alertCount > 0 && <span className="badge-count">{alertCount}</span>}
        </button>

        {/* Emergency Mayday Direct Trigger */}
        <button
          type="button"
          className="btn-emergency-header"
          onClick={onOpenEmergency}
          title="Immediate GMDSS Mayday Relay to Coast Guard"
        >
          <ShieldAlert size={16} />
          <span>MAYDAY</span>
        </button>
      </div>
    </header>
  );
}
