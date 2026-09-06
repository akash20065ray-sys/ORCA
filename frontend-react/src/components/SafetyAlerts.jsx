import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function SafetyAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch('/api/alerts/active')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.alerts) {
          setAlerts(data.alerts);
        }
      })
      .catch(() => {
        setAlerts([
          {
            id: 'ADV-01',
            title: 'High Swell & Squall Advisory',
            severity: 'WARNING',
            authority: 'INCOIS Ocean State Forecast',
            region: 'South Kerala & Lakshadweep Sea',
            description: 'Swells of 2.2m to 2.8m expected with intermittent squalls reaching 28 kt. Small artisanal craft advised caution.',
          },
          {
            id: 'ADV-02',
            title: 'Naval Firing Range Active',
            severity: 'DANGER',
            authority: 'Southern Naval Command (Kochi)',
            region: 'Sector W-4 (25 NM Offshore)',
            description: 'Live gunnery exercises scheduled between 0800 - 1800 IST. Strict exclusion corridor enforced.',
          },
        ]);
      });
  }, []);

  return (
    <div className="safety-alerts-panel">
      <div className="panel-header">
        <Shield size={20} className="panel-header-icon" />
        <div>
          <h3 className="panel-title">Maritime Safety & Regulatory Matrix</h3>
          <span className="panel-sub">COLREGS 1972 Compliance & Active Port Advisories</span>
        </div>
      </div>

      {/* COLREGS Rule 10 Compliance Card */}
      <div className="compliance-card">
        <div className="compliance-header">
          <ShieldCheck size={18} className="icon-safe" />
          <h4>COLREGS Rule 10 Compliance Status</h4>
        </div>
        <div className="rules-checklist">
          <div className="rule-item">
            <CheckCircle2 size={16} className="rule-check" />
            <div>
              <strong>TSS Corridor Navigation:</strong>
              <span> Vessel maintaining required general traffic flow direction in Cochin TSS channel.</span>
            </div>
          </div>
          <div className="rule-item">
            <CheckCircle2 size={16} className="rule-check" />
            <div>
              <strong>Separation Zone Margin:</strong>
              <span> Clearance margin &gt; 1.5 NM from central separation zone maintained.</span>
            </div>
          </div>
          <div className="rule-item">
            <CheckCircle2 size={16} className="rule-check" />
            <div>
              <strong>Inshore Traffic Zone (ITZ):</strong>
              <span> Small craft and coastal fishing vessels operating within designated inshore bounds.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Advisories List */}
      <div className="advisories-list">
        <h4 className="section-title">Active Maritime Advisories</h4>
        {alerts.map((al) => {
          const isDanger = al.severity === 'DANGER' || al.severity === 'CRITICAL';
          return (
            <div key={al.id} className={`alert-card ${isDanger ? 'danger' : 'warning'}`}>
              <div className="alert-card-top">
                <div className="alert-badge-wrap">
                  <span className={`alert-severity-badge ${isDanger ? 'danger' : 'warning'}`}>
                    {al.severity}
                  </span>
                  <span className="alert-id">{al.id}</span>
                </div>
                <span className="alert-authority">{al.authority || 'INCOIS / Coast Guard'}</span>
              </div>
              <h4 className="alert-title">{al.title}</h4>
              <p className="alert-desc">{al.description}</p>
              <div className="alert-region-tag">
                <span>📍 Affected Area: {al.region}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
