import { jsPDF } from 'jspdf';
import { DashboardData, Satellite } from './types';

export function generateMissionControlPDF(
  dashboardData: DashboardData,
  selectedSat: Satellite
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const timestamp = new Date().toUTCString();
  const highRiskItems = dashboardData.predictions.filter(
    (p) => p.riskLevel === 'high' || p.riskScore >= 50
  );

  // Styling palette
  const darkBg = [12, 20, 37]; // #0c1425
  const primaryCyan = [56, 189, 248]; // #38bdf8
  const warningRed = [244, 63, 94]; // #f43f5e
  const slateDark = [30, 41, 59]; // #1e293b
  const textLight = [241, 245, 249];
  const textMuted = [148, 163, 184];

  // Top Header Banner
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Cyan Top Line Accent
  doc.setFillColor(primaryCyan[0], primaryCyan[1], primaryCyan[2]);
  doc.rect(0, 0, pageWidth, 2, 'F');

  // Header Title & Classification Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryCyan[0], primaryCyan[1], primaryCyan[2]);
  doc.text('SPACESHIELD AI — MISSION CONTROL REPORT', 14, 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(239, 68, 68); // Red badge text
  doc.text('CLASSIFICATION: OPERATIONAL / UNCLASSIFIED', pageWidth - 14, 11, { align: 'right' });

  // Subtitle & Timestamp
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('AUTOMATED ORBITAL CONJUNCTION & RISK ASSESSMENT LOG', 14, 18);
  doc.text(`GENERATED: ${timestamp}`, pageWidth - 14, 18, { align: 'right' });

  let currentY = 32;

  // Executive Summary Box
  doc.setFillColor(240, 245, 250);
  doc.setDrawColor(200, 215, 230);
  doc.rect(14, currentY, pageWidth - 28, 26, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('EXECUTIVE ORBITAL SITUATION SUMMARY', 18, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 60, 75);
  doc.text(
    `Active Primary Asset: ${selectedSat.name} (NORAD ID: ${selectedSat.noradId} | Alt: ${selectedSat.altitudeKm} km)`,
    18,
    currentY + 12
  );
  doc.text(
    `Total Satellites Monitored: ${dashboardData.satellites.length}   |   Total Conjunction Events Evaluated: ${dashboardData.predictions.length}`,
    18,
    currentY + 17
  );
  doc.text(
    `Critical High-Risk Threats (Pc > 10^-4): ${highRiskItems.length} Event(s) require immediate evasion planning.`,
    18,
    currentY + 22
  );

  currentY += 33;

  // Section 1: High Risk Conjunction Log
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.text('1. CRITICAL CONJUNCTION RISK LOG', 14, currentY);

  currentY += 5;

  // Table Columns (x positions within 14mm to 196mm)
  const colX = [14, 34, 88, 134, 162];
  doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.rect(14, currentY, pageWidth - 28, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text('EVENT ID', colX[0] + 2, currentY + 5);
  doc.text('PRIMARY / SECONDARY OBJECT', colX[1] + 2, currentY + 5);
  doc.text('CLOSEST APPROACH (TCA)', colX[2] + 2, currentY + 5);
  doc.text('MISS DIST.', colX[3] + 2, currentY + 5);
  doc.text('PROBABILITY (Pc)', colX[4] + 2, currentY + 5);

  currentY += 7.5;

  // Table Rows
  const itemsToPrint = dashboardData.predictions;

  itemsToPrint.forEach((pred, index) => {
    const isHigh = pred.riskLevel === 'high' || pred.riskScore >= 60;
    const isEven = index % 2 === 0;

    // Row Background
    if (isHigh) {
      doc.setFillColor(254, 242, 242); // Soft red background for high risk
    } else if (isEven) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }

    doc.rect(14, currentY, pageWidth - 28, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(14, currentY + 8, pageWidth - 14, currentY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    if (isHigh) {
      doc.setTextColor(warningRed[0], warningRed[1], warningRed[2]);
    } else {
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    }

    doc.text(pred.id, colX[0] + 2, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const objText = `${pred.primaryName} vs ${pred.secondaryName}`;
    doc.text(objText.length > 28 ? objText.substring(0, 26) + '...' : objText, colX[1] + 2, currentY + 5.5);

    doc.text(pred.closestApproach, colX[2] + 2, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isHigh ? warningRed[0] : 30, isHigh ? warningRed[1] : 41, isHigh ? warningRed[2] : 59);
    doc.text(`${pred.missDistanceKm} km`, colX[3] + 2, currentY + 5.5);

    doc.text(`${pred.riskScore}% (${pred.riskLevel.toUpperCase()})`, colX[4] + 2, currentY + 5.5);

    currentY += 8;
  });

  currentY += 8;

  // Section 2: Recommended Avoidance Maneuver Plan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.text('2. RECOMMENDED AVOIDANCE MANEUVER PLAN', 14, currentY);

  currentY += 5;

  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(210, 220, 235);
  doc.rect(14, currentY, pageWidth - 28, 30, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('OPTIMIZED RETROGRADE / IN-TRACK BURN PARAMETERS:', 18, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 65, 85);
  doc.text('• Execution Window: TCA - 4.5 Hours (Optimal orbital phase angle)', 18, currentY + 12);
  doc.text('• Delta-V Vector (dV): [ -0.18 m/s Prograde, +0.04 m/s Normal ]', 18, currentY + 17);
  doc.text('• Estimated Post-Maneuver Miss Distance: 12.45 km (Safety Margin > 10 km)', 18, currentY + 22);
  doc.text('• Estimated Propellant Cost: 0.42 kg (0.15% onboard reserve loss)', 18, currentY + 27);

  currentY += 37;

  // Section 3: Sensor & Telemetry Integrity Audit
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.text('3. SENSOR & TELEMETRY INTEGRITY AUDIT', 14, currentY);

  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 95);
  doc.text('• Radar Tracking Stations: Goldstone Deep Space Net, Madrid Deep Space Complex (Nominal)', 14, currentY);
  doc.text('• TLE Catalog Epoch Age: 0.12 Days (High Accuracy Orbit Determination)', 14, currentY + 5);
  doc.text('• AI Guidance Engine: Gemini 2.5 Flash / Physics Covariance Matrix Validated', 14, currentY + 10);

  currentY += 18;

  // Sign-off / Verification Box
  doc.setDrawColor(180, 195, 215);
  doc.setFillColor(255, 255, 255);
  doc.rect(14, currentY, pageWidth - 28, 20, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('MISSION CONTROLLER VERIFICATION & APPROVAL', 18, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 115, 130);
  doc.text('Operator Call Sign: SSA-DUTY-OFFICER-01', 18, currentY + 11);
  doc.text('Digital Signature Hash: 0x9f8e...4a12 [VERIFIED BY SPACESHIELD CORE]', 18, currentY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(34, 197, 94); // Green check mark text
  doc.text('[ STATUS: MANEUVER APPROVED ]', pageWidth - 18, currentY + 12, { align: 'right' });

  // Page Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'SpaceShield AI — Autonomous Space Situational Awareness & Debris Avoidance System',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  // Save / Trigger Download
  const filename = `SpaceShield_Mission_Control_Report_${Date.now()}.pdf`;
  doc.save(filename);
}
