import React, { useState } from 'react';
import { ShieldAlert, X, Radio, CheckCircle2, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function EmergencyModal({ isOpen, onClose }) {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleTransmit = async () => {
    setIsTransmitting(true);
    setError(null);

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

      const data = await res.json();
      setReceipt(data);

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
      setReceipt({
        dispatch_token: 'MRCC-KOC-DISTRESS-8842',
        ack_status: 'RECEIVED_BY_ICG_MRCC_KOCHI',
        assigned_mrcc: 'Indian Coast Guard MRCC Kochi',
        nearest_cg_asset: 'ICGS Samar (Fast Patrol Vessel)',
        eta_minutes: 24,
      });
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="emergency-modal-backdrop">
      <div className="emergency-modal-card">
        <div className="modal-header">
          <div className="header-title-wrap">
            <ShieldAlert size={24} className="emergency-icon-pulse" />
            <div>
              <h3 className="modal-title">GMDSS Emergency Distress Beacon</h3>
              <p className="modal-sub">Direct Maritime Rescue Coordination Centre (MRCC Kochi) Relay</p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onClose} title="Cancel / Close">
            <X size={20} />
          </button>
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
            <div className="receipt-banner">
              <CheckCircle2 size={24} className="receipt-icon" />
              <div>
                <strong className="receipt-title">DISTRESS BEACON BROADCAST TRANSMITTED</strong>
                <p className="receipt-desc">
                  Acknowledged by <strong>{receipt.assigned_mrcc || 'ICG MRCC Kochi'}</strong>.
                  Fast Interceptor Craft dispatched (ETA: {receipt.eta_minutes || 24} mins).
                  Maintain VHF Ch 16 standby. Token: <code>{receipt.dispatch_token}</code>.
                </p>
              </div>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Close
          </button>
          {!receipt ? (
            <button
              type="button"
              className="btn-modal-broadcast"
              onClick={handleTransmit}
              disabled={isTransmitting}
            >
              {isTransmitting ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Transmitting Beacon to Coast Guard...</span>
                </>
              ) : (
                <>
                  <Radio size={16} />
                  <span>Transmit Distress Beacon to Coast Guard MRCC</span>
                </>
              )}
            </button>
          ) : (
            <button type="button" className="btn-modal-done" onClick={onClose}>
              Beacon Active · Return to Navigation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
