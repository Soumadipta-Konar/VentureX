'use strict';

import { VEHICLE_SPECS } from '../config/vehicleSpecs.js';
import { CHEMISTRY_CONFIG } from '../config/chemistryConfig.js';
import { determineGrade, getWarrantyStructure } from './gradingAndWarranty.js';
import { calculateSellerPayout } from './valuationEngine.js';

export function deriveCyclesFromKm(category, odometerKm) {
  const spec = VEHICLE_SPECS[category] || VEHICLE_SPECS['2W'];
  if (!odometerKm || odometerKm <= 0) return 0;
  return Math.round(odometerKm / spec.kmPerCycle);
}

export function calculateProvisionalSOH(params) {
  const category = params.category || '2W';
  const chemistry = (params.chemistry || 'LFP').toUpperCase();
  const ageYears = Math.max(0.1, Number(params.ageYears) || 1);
  
  const chemConfig = CHEMISTRY_CONFIG[chemistry] || CHEMISTRY_CONFIG.LFP;
  const spec = VEHICLE_SPECS[category] || VEHICLE_SPECS['2W'];

  let cycles = Number(params.cycleCount);
  let cycleDerivedFromKm = false;
  if (isNaN(cycles) || params.cycleCount === null || params.cycleCount === undefined || params.cycleCount === '' || cycles < 0) {
    const km = Number(params.odometerKm) || 0;
    cycles = deriveCyclesFromKm(category, km);
    cycleDerivedFromKm = true;
  }

  const dod = Math.min(100, Math.max(20, Number(params.dodPercent) || 80));
  const tempC = Math.min(60, Math.max(10, Number(params.avgTempC) || 30));
  const packCapacityKWh = Number(params.packCapacityKWh) || spec.defaultCapacityKWh;

  const cycleRatio = cycles / chemConfig.nominalCycleLife;
  const dodFactor = 1.0 + 0.6 * ((dod - 80) / 100);
  const cyclicLossPercent = 20.0 * Math.pow(Math.max(0, cycleRatio), chemConfig.cycleAlpha) * Math.max(0.5, dodFactor);

  const tempDelta = Math.max(0, tempC - 25);
  const arrheniusFactor = Math.exp(chemConfig.tempSensitivity * tempDelta);
  const calendarLossPercent = (chemConfig.calendarDecayPerYear * 100) * ageYears * arrheniusFactor;

  const totalLossPercent = cyclicLossPercent + calendarLossPercent;
  const rawSOH = 100.0 - totalLossPercent;
  const estimatedSOH = Math.round(Math.max(10, Math.min(100, rawSOH)) * 10) / 10;

  const gradeInfo = determineGrade(estimatedSOH);
  const warrantyInfo = getWarrantyStructure(gradeInfo.grade);
  const payoutInfo = calculateSellerPayout({
    soh: estimatedSOH,
    grade: gradeInfo.grade,
    chemistry,
    category,
    packCapacityKWh
  });

  return {
    stage: 1,
    stageLabel: 'Provisional Online Estimate',
    isProvisional: true,
    disclaimer: 'This is a provisional estimate based on self-reported usage history. Final payout is confirmed after doorstep pickup and technician verification.',
    inputs: {
      category,
      categoryName: spec.name,
      chemistry,
      chemistryName: chemConfig.name,
      ageYears,
      cycles,
      cycleDerivedFromKm,
      odometerKm: params.odometerKm || (cycles * spec.kmPerCycle),
      dodPercent: dod,
      avgTempC: tempC,
      packCapacityKWh,
      nominalVoltage: spec.nominalVoltage
    },
    degradationBreakdown: {
      cyclicLossPercent: Math.round(cyclicLossPercent * 10) / 10,
      calendarLossPercent: Math.round(calendarLossPercent * 10) / 10,
      totalLossPercent: Math.round(totalLossPercent * 10) / 10,
      arrheniusThermalMultiplier: Math.round(arrheniusFactor * 100) / 100
    },
    estimatedSOH,
    grade: gradeInfo.grade,
    gradeName: gradeInfo.name,
    secondLifeApplication: gradeInfo.application,
    gradeBadgeColor: gradeInfo.badgeColor,
    warranty: warrantyInfo,
    payout: payoutInfo
  };
}
