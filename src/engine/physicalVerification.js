'use strict';

import { calculateProvisionalSOH } from './degradationModel.js';
import { determineGrade, getWarrantyStructure } from './gradingAndWarranty.js';
import { calculateSellerPayout } from './valuationEngine.js';

export function calculateVerifiedSOH(provisionalResult, inspectionData) {
  const prov = JSON.parse(JSON.stringify(provisionalResult));
  const inspection = inspectionData || {};

  const hasVisualDamage = Boolean(inspection.hasVisualDamage);
  const bmsAccessible = Boolean(inspection.bmsAccessible);
  const bmsCycles = Number(inspection.bmsCycles);
  const measuredVoltage = Number(inspection.measuredVoltage);

  let verifiedSOH = prov.estimatedSOH;
  let verificationFlags = [];
  let gradeOverride = null;
  let bmsDiscrepancy = false;

  if (bmsAccessible && !isNaN(bmsCycles) && bmsCycles >= 0) {
    const reportedCycles = prov.inputs.cycles;
    const diff = Math.abs(bmsCycles - reportedCycles);
    const percentDev = reportedCycles > 0 ? (diff / reportedCycles) * 100 : 100;

    if (percentDev > 15) {
      bmsDiscrepancy = true;
      verificationFlags.push(`BMS Discrepancy Alert: Logged cycles (${bmsCycles}) differ from self-reported (${reportedCycles}) by ${Math.round(percentDev)}%. Recalculating SOH...`);
      
      const recalculated = calculateProvisionalSOH({
        ...prov.inputs,
        cycleCount: bmsCycles
      });
      verifiedSOH = recalculated.estimatedSOH;
    } else {
      verificationFlags.push(`BMS Verification Passed: Logged cycles (${bmsCycles}) match self-reported within ${Math.round(percentDev)}% margin.`);
    }
  }

  const nomVolts = prov.inputs.nominalVoltage;
  if (!isNaN(measuredVoltage) && measuredVoltage > 0) {
    const voltageRatio = measuredVoltage / nomVolts;
    if (voltageRatio < 0.82) {
      verifiedSOH = Math.max(10, verifiedSOH - 15);
      verificationFlags.push(`Terminal Voltage Anomaly: Measured ${measuredVoltage}V vs nominal ${nomVolts}V (-15% SOH adjustment applied due to cell imbalance).`);
    } else if (voltageRatio < 0.90) {
      verifiedSOH = Math.max(10, verifiedSOH - 5);
      verificationFlags.push(`Minor Voltage Drop: Measured ${measuredVoltage}V vs nominal ${nomVolts}V (-5% SOH adjustment).`);
    } else {
      verificationFlags.push(`Voltage Check Passed: Measured ${measuredVoltage}V matches healthy nominal parameters.`);
    }
  }

  if (hasVisualDamage) {
    verificationFlags.push('PHYSICAL DAMAGE ALERT: Casing/Water/Structural damage observed during inspection. Grade capped at Grade C / Reject.');
    if (verifiedSOH > 65) {
      verifiedSOH = 62.0;
    }
    gradeOverride = verifiedSOH >= 50 ? 'GRADE_C' : 'REJECT';
  }

  verifiedSOH = Math.round(Math.max(5, Math.min(100, verifiedSOH)) * 10) / 10;

  const finalGradeInfo = determineGrade(verifiedSOH);
  if (gradeOverride && (finalGradeInfo.grade === 'GRADE_A' || finalGradeInfo.grade === 'GRADE_B')) {
    finalGradeInfo.grade = gradeOverride;
    finalGradeInfo.name = gradeOverride === 'GRADE_C' ? 'Grade C (Low-Stakes UPS Backup)' : 'Reject / Recycling Clearance';
    finalGradeInfo.badgeColor = gradeOverride === 'GRADE_C' ? '#d97706' : '#dc2626';
  }

  const finalWarranty = getWarrantyStructure(finalGradeInfo.grade);
  const finalPayout = calculateSellerPayout({
    soh: verifiedSOH,
    grade: finalGradeInfo.grade,
    chemistry: prov.inputs.chemistry,
    category: prov.inputs.category,
    packCapacityKWh: prov.inputs.packCapacityKWh
  });

  return {
    stage: 2,
    stageLabel: 'Verified Grade — Final Payout Basis',
    isProvisional: false,
    provisionalSOH: prov.estimatedSOH,
    provisionalPayoutTotal: prov.payout.totalPayoutINR,
    verifiedSOH,
    verifiedGrade: finalGradeInfo.grade,
    verifiedGradeName: finalGradeInfo.name,
    verifiedBadgeColor: finalGradeInfo.badgeColor,
    warranty: finalWarranty,
    payout: finalPayout,
    inspection: {
      hasVisualDamage,
      measuredVoltage: measuredVoltage || nomVolts,
      bmsAccessible,
      bmsCycles: bmsAccessible ? bmsCycles : null,
      bmsDiscrepancy,
      verificationFlags
    }
  };
}
