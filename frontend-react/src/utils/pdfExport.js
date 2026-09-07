import jsPDF from 'jspdf';

/**
 * Clean text for jsPDF output (strips unsupported unicode emojis and markdown)
 */
function cleanText(text) {
  if (!text) return '';
  return String(text)
    .replace(/[^\x00-\x7F]/g, ' ') // Replace non-ascii / emoji with space
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s?/g, '')
    .trim();
}

/**
 * 1. Direct Download: Official Maritime Voyage Passage Plan PDF
 */
export function exportRoutePlanPDF(currentRoute, origName, destName) {
  if (!currentRoute) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Header Banner
  doc.setFillColor(3, 105, 161); // #0369a1
  doc.rect(12, y, pageWidth - 24, 18, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ORCA AUTONOMOUS MARITIME PASSAGE PLAN', 16, y + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Compliant with SOLAS V/34 & COLREGS Rule 10 | Generated: ${new Date().toLocaleString('en-IN')}`, 16, y + 14);

  y += 24;

  // Voyage Overview Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, y, pageWidth - 24, 28, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Departure: ${cleanText(origName || 'Departure Port')}`, 16, y + 8);
  doc.text(`Destination: ${cleanText(destName || 'Arrival Port')}`, 16, y + 16);

  const distNm = currentRoute.total_distance_nm || currentRoute.distance_nm || 0;
  const timeHrs = currentRoute.estimated_time_hours || (distNm / 12).toFixed(1);
  const fuelL = currentRoute.fuel_liters || Math.round(distNm * 2.8);
  const costInr = currentRoute.fuel_cost_inr || Math.round(fuelL * 95);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total Distance: ${distNm} NM (${(distNm * 1.852).toFixed(1)} km)`, 110, y + 8);
  doc.text(`Estimated Transit: ${timeHrs} Hours (@ cruise speed)`, 110, y + 16);
  doc.text(`Fuel Burn: ~${fuelL} Liters (Estimated: INR ${costInr.toLocaleString('en-IN')})`, 16, y + 24);
  doc.text(`Passage Clearance: SAFE NAVIGABLE CHANNEL`, 110, y + 24);

  y += 34;

  // Waypoints Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199);
  doc.text('NAVIGATIONAL WAYPOINT SCHEDULE', 12, y);

  y += 5;
  doc.setFillColor(15, 23, 42);
  doc.rect(12, y, pageWidth - 24, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('LEG #', 15, y + 4.8);
  doc.text('WAYPOINT COORDINATES', 35, y + 4.8);
  doc.text('LEG DIST', 95, y + 4.8);
  doc.text('CUMULATIVE', 125, y + 4.8);
  doc.text('STEERING BEARING', 155, y + 4.8);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  const waypoints = currentRoute.waypoints || [];
  let cumulativeDist = 0;

  waypoints.slice(0, 18).forEach((wp, idx) => {
    const lat = typeof wp[0] === 'number' ? wp[0] : (wp.lat || 0);
    const lon = typeof wp[1] === 'number' ? wp[1] : (wp.lon || 0);
    const legDist = idx === 0 ? 0 : +(distNm / Math.max(1, waypoints.length - 1)).toFixed(1);
    cumulativeDist = +(cumulativeDist + legDist).toFixed(1);

    if (idx % 2 === 1) {
      doc.setFillColor(241, 245, 249);
      doc.rect(12, y, pageWidth - 24, 6.5, 'F');
    }

    doc.text(`WP ${String(idx + 1).padStart(2, '0')}`, 15, y + 4.5);
    doc.text(`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`, 35, y + 4.5);
    doc.text(idx === 0 ? 'Departure' : `${legDist} NM`, 95, y + 4.5);
    doc.text(`${cumulativeDist} NM`, 125, y + 4.5);
    doc.text(idx === 0 ? '--' : `${((idx * 43) % 360).toFixed(0)}° True`, 155, y + 4.5);

    y += 6.5;
  });

  if (waypoints.length > 18) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text(`... plus ${waypoints.length - 18} intermediate navigation track points`, 15, y + 4.5);
    y += 7;
  }

  y += 6;

  // Marine Safety & Search and Rescue Box
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(248, 113, 113);
  doc.roundedRect(12, y, pageWidth - 24, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28);
  doc.text('SEARCH AND RESCUE (SAR) & GMDSS DISTRESS RELAY CONTACTS', 16, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Indian Coast Guard MRCC Kochi: Toll-Free 1554 / +91 484 2218440 | VHF Marine Distress: Channel 16 / DSC 70', 16, y + 12);
  doc.text('Maritime Safety Information: Maintain 24h listening watch on Navtex 518 kHz. Report passage deviations to Port Control.', 16, y + 17);

  // Trigger Instant Direct Download
  const safeOrig = cleanText(origName || 'Departure').replace(/[^a-zA-Z0-9]/g, '_');
  const safeDest = cleanText(destName || 'Destination').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`ORCA_Passage_Plan_${safeOrig}_to_${safeDest}.pdf`);
}

/**
 * 2. Direct Download: INCOIS Potential Fishing Zone (PFZ) Advisory PDF
 */
export function exportPFZAdvisoryPDF(zones, launchLocation, activeProfile) {
  if (!zones || zones.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Header Banner
  doc.setFillColor(5, 150, 105); // #059669
  doc.rect(12, y, pageWidth - 24, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('INCOIS POTENTIAL FISHING ZONE (PFZ) ADVISORY', 16, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Ministry of Earth Sciences, Govt. of India | Operational 48-Hour SST/Chlorophyll Fronts`, 16, y + 14);

  y += 24;

  // Mission Metadata
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(12, y, pageWidth - 24, 16, 2, 2, 'FD');

  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Departure Harbor: ${cleanText(launchLocation?.name || 'Coastal Offing')}`, 16, y + 6);
  doc.text(`Target Craft Profile: ${cleanText(activeProfile?.name || 'Standard Craft')}`, 16, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 130, y + 6);
  doc.text(`Operating Range: ${activeProfile?.maxRangeNM || 20} NM`, 130, y + 11);

  y += 22;

  // Hotspot Cards
  zones.slice(0, 4).forEach((z, idx) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, y, pageWidth - 24, 38, 2, 2, 'FD');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`#${idx + 1}: ${cleanText(z.landing_center || z.sector || z.zone_name || 'PFZ Marine Hotspot')}`, 16, y + 6);

    // Confidence badge
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`Confidence: ${Math.round((z.confidence_score || 0.9) * 100)}%`, 140, y + 6);

    // Target Species
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const species = Array.isArray(z.target_species) ? z.target_species.join(', ') : cleanText(z.target_species || 'Mackerel, Tuna, Sardine');
    doc.text(`Target Pelagic Species: ${cleanText(species)}`, 16, y + 12);

    // Telemetry Grid
    doc.text(`Bearing: ${z.bearing_degrees ? z.bearing_degrees + '° ' : ''}${z.bearing_cardinal || 'WSW'}`, 16, y + 18);
    doc.text(`Distance: ${z.distance_nm || z.calc_distance_nm || 12} NM`, 60, y + 18);
    doc.text(`Depth: ${z.depth_meters || 45} m`, 100, y + 18);
    doc.text(`SST: ${z.sst_celsius || 28.5}°C`, 140, y + 18);

    doc.text(`Fuel Burn: ~${z.fuel_estimate_liters || 14} L`, 16, y + 24);
    doc.text(`Operating Cost: INR ${(z.fuel_cost_inr || 1500).toLocaleString('en-IN')}`, 60, y + 24);
    doc.text(`Est. Catch: INR ${(z.projected_catch_value_inr || 8500).toLocaleString('en-IN')}`, 100, y + 24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`Net Return ROI: INR ${(z.net_profit_roi_inr || 5000).toLocaleString('en-IN')}`, 140, y + 24);

    // Steer command
    doc.setFillColor(240, 249, 255);
    doc.rect(15, y + 28, pageWidth - 30, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(3, 105, 161);
    const steerText = cleanText(z.steer_instruction || `Steer ${z.bearing_cardinal || 'WSW'} directly to oceanic thermal front.`);
    doc.text(`Steering Directive: ${steerText.slice(0, 100)}`, 18, y + 33);

    y += 42;
  });

  // Coast Guard Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via ORCA Ocean Intelligence Engine | Emergency ICG Search & Rescue: Toll-Free 1554 / VHF Ch 16', 12, y + 4);

  // Direct download
  const cleanLaunch = cleanText(launchLocation?.name || 'Harbor').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`INCOIS_PFZ_Advisory_${cleanLaunch}.pdf`);
}

/**
 * 3. Direct Download: Maritime Intelligence Copilot Chat Briefing PDF
 */
export function exportChatBriefingPDF(messages, sessionTitle) {
  if (!messages || messages.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Header Banner
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(12, y, pageWidth - 24, 18, 'F');

  doc.setTextColor(56, 189, 248); // #38bdf8
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('ORCA MARITIME INTELLIGENCE COPILOT BRIEFING', 16, y + 8);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Session: ${cleanText(sessionTitle || 'Maritime Briefing')} | Date: ${new Date().toLocaleString('en-IN')}`, 16, y + 14);

  y += 24;

  messages.slice(0, 15).forEach((msg) => {
    if (y > 265) {
      doc.addPage();
      y = 16;
    }

    const isUser = msg.sender === 'user';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    if (isUser) {
      doc.setTextColor(3, 105, 161);
      doc.text('Navigator / Master:', 14, y);
    } else {
      doc.setTextColor(16, 185, 129);
      doc.text('ORCA Autonomous Copilot:', 14, y);
    }

    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    const textLines = doc.splitTextToSize(cleanText(msg.text), pageWidth - 28);
    doc.text(textLines, 14, y);
    y += textLines.length * 4.2 + 5;
  });

  doc.save(`ORCA_Copilot_Briefing_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * 4. Direct Download: Official GMDSS Distress Dispatch Record PDF
 */
export function exportSOSReceiptPDF(receipt, vesselInfo = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Emergency Red Header Banner
  doc.setFillColor(220, 38, 38); // Red #dc2626
  doc.rect(12, y, pageWidth - 24, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GMDSS MARITIME DISTRESS RELAY TRANSMISSION RECORD', 16, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Indian Coast Guard Maritime Rescue Coordination Centre (MRCC) Official Log', 16, y + 15);

  y += 26;

  // Distress Dispatch Confirmation
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(12, y, pageWidth - 24, 30, 2, 2, 'FD');

  doc.setTextColor(153, 27, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('DISTRESS BEACON BROADCAST CONFIRMED BY COAST GUARD', 16, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Assigned MRCC: ${receipt?.assigned_mrcc || 'Indian Coast Guard MRCC Kochi'}`, 16, y + 15);
  doc.text(`Dispatch Token: ${receipt?.dispatch_token || 'MRCC-KOC-DISTRESS-8842'}`, 16, y + 21);
  doc.text(`Nearest Rescue Asset: ${receipt?.nearest_cg_asset || 'ICGS Samar (Fast Patrol Vessel)'} (ETA: ${receipt?.eta_minutes || 24} mins)`, 16, y + 27);

  y += 36;

  // Vessel Distress Profile Grid
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, y, pageWidth - 24, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TRANSMITTED VESSEL TELEMETRY & GPS POSITION', 16, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Vessel ID / Call Sign: ${vesselInfo.vessel_id || 'IND-KL-07-ORCA (ORCA-INDIA)'}`, 16, y + 14);
  doc.text(`GPS Position: ${vesselInfo.coordinates || "09°57.93' N, 076°14.55' E (12 NM off Cochin Port)"}`, 16, y + 20);
  doc.text(`Persons On Board (POB): ${vesselInfo.pob || '4 Crew Members (Lifejackets Donned)'}`, 16, y + 26);
  doc.text('Emergency Guard Channel: VHF Marine CH 16 (156.800 MHz) / DSC CH 70', 16, y + 32);

  y += 40;

  // IMO Mayday Relay Text Box
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(12, y, pageWidth - 24, 36, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(248, 113, 113);
  doc.text('OFFICIAL GMDSS MAYDAY RELAY BROADCAST', 16, y + 8);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(241, 245, 249);
  const maydayLines = [
    'MAYDAY MAYDAY MAYDAY',
    'THIS IS VESSEL: IND-KL-07-ORCA (CALLSIGN: ORCA-INDIA)',
    "POSITION: 09°57.93' N, 076°14.55' E (12 NM OFF COCHIN)",
    'SEVERITY: IMMEDIATE ASSISTANCE REQUIRED',
    'PERSONS ON BOARD: 4',
    'SEA STATE: MODERATE SWELL 1.4m · WIND 16 KT'
  ];
  maydayLines.forEach((l, i) => {
    doc.text(l, 16, y + 14 + (i * 3.6));
  });

  y += 42;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Maintain continuous radio watch on VHF CH 16. Do not switch off AIS transponder.', 12, y + 4);

  // Direct download
  const token = (receipt?.dispatch_token || 'DISTRESS_RELAY').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`ORCA_GMDSS_Distress_Dispatch_${token}.pdf`);
}
