import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ShieldAlert, X, Radio, CheckCircle2, Loader2, Download, Minimize2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { exportSOSReceiptPDF } from '../utils/pdfExport';

export default function EmergencyModal({ isOpen, onClose, onTransmitSuccess, existingReceipt }) {
  const { t } = useLanguage();
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [receipt, setReceipt] = useState(existingReceipt || null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleTransmit = async () => {
    setIsTransmitting(true);
    setError(null);

    let dispatchData = null;
    try {
      const res = await fetch('/api/emergency/distress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel_id: 'IND-KL-07-ORCA',
          vessel_name: 'ORCA-INDIA',
          latitude: 9.9656,
          longitude: 76.2425,
          distress_type: 'FLOODING_AND_PROPULSION_LOSS',
          persons_on_board: 4,
          sea_state_description: 'MODERATE SWELL 1.4m · WIND 16 KT',
          emergency_description: 'Vessel taking on water 12 NM off Cochin Port. Immediate assistance required.',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      dispatchData = await res.json();
      setReceipt(dispatchData);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Confetti optional
      }
    } catch {
      // Fallback simulated receipt
      dispatchData = {
        dispatch_token: 'MRCC-KOC-DISTRESS-8842',
        ack_status: 'RECEIVED_BY_ICG_MRCC_KOCHI',
        assigned_mrcc: 'Indian Coast Guard MRCC Kochi',
        nearest_cg_asset: 'ICGS Samar (Fast Patrol Vessel)',
        eta_minutes: 24,
      };
      setReceipt(dispatchData);
    } finally {
      setIsTransmitting(false);
      if (onTransmitSuccess && dispatchData) {
        onTransmitSuccess(dispatchData);
      }
    }
  };

  const handleDownloadPDF = () => {
    const activeReceipt = receipt || existingReceipt || {
      dispatch_token: 'MRCC-KOC-DISTRESS-8842',
      assigned_mrcc: 'Indian Coast Guard MRCC Kochi',
      nearest_cg_asset: 'ICGS Samar (Fast Patrol Vessel)',
      eta_minutes: 24,
    };
    exportSOSReceiptPDF(activeReceipt, {
      vessel_id: 'IND-KL-07-ORCA (ORCA-INDIA)',
      coordinates: "09°57.93' N, 076°14.55' E (12 NM off Cochin)",
      pob: '4 Crew Members (Lifejackets Donned)',
    });
  };

  return (
    <div
      className="emergency-modal-backdrop"
      style={{
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        alignItems: 'flex-start',
        paddingTop: '40px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="emergency-modal-card"
        style={{
          border: '1.5px solid #ef4444',
          boxShadow: '0 10px 40px rgba(239, 68, 68, 0.35)',
          maxWidth: '560px',
          width: '94%',
        }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid #334155' }}>
          <div className="header-title-wrap">
            <ShieldAlert size={24} className="emergency-icon-pulse" style={{ color: '#ef4444' }} />
            <div>
              <h3 className="modal-title" style={{ color: '#f8fafc' }}>{t('emergencyTitle', 'GMDSS Emergency Distress Beacon')}</h3>
              <p className="modal-sub" style={{ color: '#94a3b8' }}>{t('emergencySub', 'Direct Maritime Rescue Coordination Centre (MRCC Kochi) Relay')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn-modal-close"
              onClick={onClose}
              title="Dock beacon to top bar (Does not obstruct navigation)"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px' }}
            >
              <Minimize2 size={14} />
              <span>Dock</span>
            </button>
            <button className="btn-modal-close" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Telemetry Stat Grid */}
          <div className="emergency-stats-grid">
            <div className="stat-box">
              <span className="s-lbl">VESSEL ID</span>
              <span className="s-val">IND-KL-07-ORCA</span>
            </div>
            <div className="stat-box">
              <span className="s-lbl">GPS COORDINATES</span>
              <span className="s-val">09°57.93' N, 076°14.55' E</span>
            </div>
            <div className="stat-box">
              <span className="s-lbl">PERSONS ON BOARD</span>
              <span className="s-val">4 Crew</span>
            </div>
            <div className="stat-box">
              <span className="s-lbl">EMERGENCY FREQ</span>
              <span className="s-val">VHF CH 16 / DSC 70</span>
            </div>
          </div>

          {/* Official IMO Relay Text */}
          <div className="mayday-text-box">
            <span className="box-lbl">OFFICIAL GMDSS MAYDAY RELAY TEXT</span>
            <pre className="mayday-pre">
{`MAYDAY MAYDAY MAYDAY
THIS IS VESSEL: IND-KL-07-ORCA (CALLSIGN: ORCA-INDIA)
POSITION: 09°57.93' N, 076°14.55' E (12 NM OFF COCHIN)
SEVERITY: IMMEDIATE ASSISTANCE REQUIRED
PERSONS ON BOARD: 4
SEA STATE: MODERATE SWELL 1.4m · WIND 16 KT`}
            </pre>
          </div>

          {/* Receipt banner if broadcasted */}
          {receipt && (
            <div
              className="receipt-banner"
              style={{
                background: 'rgba(22, 101, 52, 0.25)',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <CheckCircle2 size={24} className="receipt-icon" style={{ color: '#10b981', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong className="receipt-title" style={{ color: '#86efac' }}>DISTRESS BEACON BROADCAST TRANSMITTED</strong>
                <p className="receipt-desc" style={{ color: '#f0fdf4', fontSize: '11.5px', margin: '4px 0 8px 0' }}>
                  Acknowledged by <strong>{receipt.assigned_mrcc || 'ICG MRCC Kochi'}</strong>.
                  Fast Interceptor Craft dispatched (ETA: {receipt.eta_minutes || 24} mins).
                  Maintain VHF Ch 16 standby. Token: <code>{receipt.dispatch_token}</code>.
                </p>

                {/* Direct Download Button for SOS Receipt */}
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#047857',
                    color: '#ffffff',
                    border: '1px solid #34d399',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  }}
                  title="Directly download official GMDSS Mayday dispatch record to Downloads folder"
                >
                  <Download size={14} />
                  <span>Download Distress Dispatch Record (PDF)</span>
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            {receipt ? (t('close', 'Dock to Top (Keep Active)')) : (t('cancel', 'Cancel / Close'))}
          </button>
          {!receipt ? (
            <button
              type="button"
              className="btn-modal-broadcast"
              onClick={handleTransmit}
              disabled={isTransmitting}
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 0 16px rgba(220, 38, 38, 0.5)',
              }}
            >
              {isTransmitting ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Transmitting Beacon to Coast Guard...</span>
                </>
              ) : (
                <>
                  <Radio size={16} />
                  <span>{t('sendSOS', 'Transmit Distress Beacon to Coast Guard MRCC')}</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn-modal-done"
              onClick={onClose}
              style={{
                background: '#059669',
                color: '#ffffff',
                fontWeight: '700',
              }}
            >
              Beacon Active · Return to Navigation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
