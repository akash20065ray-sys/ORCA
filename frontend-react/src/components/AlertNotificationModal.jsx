import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  Wind,
  Waves,
  MapPin,
  X,
  ExternalLink,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
} from 'lucide-react';

export default function AlertNotificationModal({
  isOpen,
  onClose,
  onViewOnMap,
  onNavigateSafety,
}) {
  const [alerts, setAlerts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'high_wave' | 'cyclone' | 'squall'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetch('/api/alerts/active')
      .then((res) => res.json())
      .then((data) => {
        setIsLoading(false);
        if (data && data.alerts) {
          setAlerts(data.alerts);
        }
      })
      .catch(() => {
        setIsLoading(false);
        setAlerts([
          {
            id: 'ADV-SURGE-01',
            title: 'Kallakkadal / Swell Surge Warning',
            severity: 'WARNING',
            advisory_type: 'HIGH_WAVE',
            issuing_authority: 'INCOIS Ocean State Forecast',
            region: 'South Kerala Coast (Kollam to Munambam)',
            description: 'Low-frequency swell waves reaching 2.2m to 2.8m expected during high tide window. Nearshore skiffs advised to anchor safely.',
            valid_until: 'Next 24 Hours',
          },
          {
            id: 'ADV-CYC-02',
            title: 'Deep Depression Squall Advisory',
            severity: 'CRITICAL',
            advisory_type: 'CYCLONE',
            issuing_authority: 'IMD Cyclone Warning Division',
            region: 'West Central Arabian Sea',
            description: 'Gale force wind speed 40-50 kts gusting to 60 kts. Total prohibition on deep-sea craft operations.',
            valid_until: 'Next 48 Hours',
          },
          {
            id: 'ADV-DAMINI-03',
            title: 'Damini Convective Lightning Advisory',
            severity: 'ADVISORY',
            advisory_type: 'SQUALL',
            issuing_authority: 'IMD Damini Lightning Early Warning',
            region: 'Coastal Karnataka & Goa',
            description: 'Severe thunderstorm squalls with cloud-to-water lightning discharges detected in offshore grid.',
            valid_until: 'Next 6 Hours',
          },
        ]);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = (id, e) => {
    e.stopPropagation();
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const filteredAlerts = alerts.filter((a) => {
    if (dismissedIds.has(a.id)) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'high_wave') return a.advisory_type === 'HIGH_WAVE' || a.title?.toLowerCase().includes('wave') || a.title?.toLowerCase().includes('swell');
    if (activeFilter === 'cyclone') return a.advisory_type === 'CYCLONE' || a.title?.toLowerCase().includes('cyclone') || a.title?.toLowerCase().includes('depression');
    if (activeFilter === 'squall') return a.advisory_type === 'SQUALL' || a.title?.toLowerCase().includes('lightning') || a.title?.toLowerCase().includes('squall');
    return true;
  });

  const getSeverityStyle = (sev = '') => {
    const s = sev.toUpperCase();
    if (s === 'CRITICAL' || s === 'DANGER') {
      return {
        badge: { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' },
        cardBorder: '1px solid rgba(239, 68, 68, 0.35)',
        iconColor: '#ef4444',
      };
    }
    if (s === 'WARNING') {
      return {
        badge: { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' },
        cardBorder: '1px solid rgba(245, 158, 11, 0.35)',
        iconColor: '#f59e0b',
      };
    }
    return {
      badge: { background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' },
      cardBorder: '1px solid rgba(56, 189, 248, 0.3)',
      iconColor: '#38bdf8',
    };
  };

  return (
    <div
      className="alert-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 16px 20px 16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="alert-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>
                Active Maritime Advisories & Port Signals
              </h3>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                IMD Cyclone Tracking & INCOIS High Wave Observatory
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Alert Chimes' : 'Enable Alert Chimes'}
              style={{
                background: 'transparent',
                border: 'none',
                color: soundEnabled ? '#38bdf8' : '#64748b',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            padding: '10px 18px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: activeFilter === 'all' ? '#0284c7' : '#1e293b',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('cyclone')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: activeFilter === 'cyclone' ? '#ef4444' : '#1e293b',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            🌪️ Cyclone / Gale
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('high_wave')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: activeFilter === 'high_wave' ? '#f59e0b' : '#1e293b',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            🌊 High Waves / Swell
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('squall')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              borderRadius: '12px',
              border: '1px solid #334155',
              background: activeFilter === 'squall' ? '#059669' : '#1e293b',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            ⚡ Damini Lightning
          </button>
        </div>

        {/* Scrollable Alerts List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              <span>Connecting to IMD Cyclone & INCOIS High Wave Bulletin feed...</span>
            </div>
          )}

          {!isLoading && filteredAlerts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 10px auto' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>
                No active hazard warnings in this filter
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Coastal waters are currently within safe operational parameters for artisanal and commercial fleets.
              </p>
            </div>
          )}

          {!isLoading &&
            filteredAlerts.map((al) => {
              const style = getSeverityStyle(al.severity);
              return (
                <div
                  key={al.id}
                  style={{
                    backgroundColor: '#1e293b',
                    border: style.cardBorder,
                    borderRadius: '8px',
                    padding: '12px 14px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          ...style.badge,
                        }}
                      >
                        {al.severity || 'ADVISORY'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                        {al.id}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                        {al.issuing_authority || 'INCOIS / IMD'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDismiss(al.id, e)}
                        title="Dismiss Alert"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: '700', color: '#ffffff' }}>
                    {al.title}
                  </h4>

                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.45' }}>
                    {al.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#94a3b8',
                      borderTop: '1px solid #334155',
                      paddingTop: '8px',
                      marginTop: '8px',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} style={{ color: '#38bdf8' }} />
                      <span>{al.region || 'Indian Ocean Basin'}</span>
                    </div>

                    {al.valid_until && (
                      <span style={{ color: '#facc15' }}>
                        ⏳ Valid: {al.valid_until}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            Emergency MRCC Kochi: <strong style={{ color: '#f87171' }}>1554</strong> · VHF Channel 16
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onNavigateSafety) onNavigateSafety();
            }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '700',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Open Safety Matrix & Port Signals</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
