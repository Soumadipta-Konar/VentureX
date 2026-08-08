'use strict';

import { MARKET_BENCHMARKS } from '../config/marketBenchmarks.js';

export function calculateSellerPayout(params) {
  const { soh, grade, chemistry, packCapacityKWh } = params;
  const kwh = packCapacityKWh || 3.5;
  const chem = (chemistry || 'LFP').toUpperCase();

  let baseRatePerKWh = 0;
  if (grade === 'GRADE_A') {
    baseRatePerKWh = 3800 + (soh - 80) * 80;
  } else if (grade === 'GRADE_B') {
    baseRatePerKWh = 2600 + (soh - 65) * 70;
  } else if (grade === 'GRADE_C') {
    baseRatePerKWh = 1800 + (soh - 50) * 50;
  } else {
    baseRatePerKWh = 950;
  }

  const platformBasePayoutINR = Math.round(baseRatePerKWh * kwh);

  const eprRatePerKWh = MARKET_BENCHMARKS.eprCreditPerKWh[chem] || MARKET_BENCHMARKS.eprCreditPerKWh.LFP;
  const estimatedEPRCreditINR = Math.round(eprRatePerKWh * kwh);

  const totalPayoutINR = platformBasePayoutINR + estimatedEPRCreditINR;

  const informalScrapTotalINR = Math.round(MARKET_BENCHMARKS.informalScrapRatePerKWh * kwh);
  const sellerPremiumOverScrapINR = Math.max(0, totalPayoutINR - informalScrapTotalINR);
  const sellerPremiumPercent = informalScrapTotalINR > 0 ? Math.round((sellerPremiumOverScrapINR / informalScrapTotalINR) * 100) : 0;

  return {
    packCapacityKWh: kwh,
    platformBasePayoutINR,
    baseRatePerKWh: Math.round(baseRatePerKWh),
    estimatedEPRCreditINR,
    eprRatePerKWh,
    eprLegalBasis: 'Battery Waste Management Rules 2022 (MoEFCC Notification)',
    totalPayoutINR,
    informalScrapBaselineINR: informalScrapTotalINR,
    informalScrapRatePerKWh: MARKET_BENCHMARKS.informalScrapRatePerKWh,
    sellerPremiumOverScrapINR,
    sellerPremiumPercent
  };
}

export function calculateB2BPricing(params) {
  const targetSegment = params.targetSegment || 'TELECOM_TOWER';
  const kwh = Math.max(10, Number(params.requiredCapacityKWh) || 100);
  const grade = params.requestedGrade || 'GRADE_A';
  const chemistry = (params.chemistry || 'LFP').toUpperCase();

  let pricePerKWh = 0;
  if (grade === 'GRADE_A') pricePerKWh = 5400;
  else if (grade === 'GRADE_B') pricePerKWh = 4100;
  else pricePerKWh = 2900;

  const totalSecondLifePriceINR = Math.round(pricePerKWh * kwh);

  const newLeadAcidRate = MARKET_BENCHMARKS.newLeadAcidPricePerKWh;
  const newLithiumRate = MARKET_BENCHMARKS.newLithiumPricePerKWh;

  const totalNewLeadAcidINR = Math.round(newLeadAcidRate * kwh);
  const totalNewLithiumINR = Math.round(newLithiumRate * kwh);

  const savingsVsNewLithiumINR = Math.max(0, totalNewLithiumINR - totalSecondLifePriceINR);
  const savingsPercentVsNewLithium = Math.round((savingsVsNewLithiumINR / totalNewLithiumINR) * 100);

  const co2OffsetKg = Math.round(MARKET_BENCHMARKS.co2OffsetKgPerKWh * kwh);
  const co2OffsetTons = Math.round((co2OffsetKg / 1000) * 10) / 10;

  const segmentLabels = {
    'TELECOM_TOWER': 'Telecom Tower 48V Backup (Replaces short-lived Lead-Acid)',
    'SOLAR_MICROGRID': 'Solar Micro-Grid BESS (High cycle-life requirement)',
    'COMMERCIAL_UPS': 'Commercial Building & Data Center UPS'
  };

  return {
    targetSegment,
    segmentLabel: segmentLabels[targetSegment] || targetSegment,
    requiredCapacityKWh: kwh,
    requestedGrade: grade,
    chemistry,
    secondLifePricePerKWh: pricePerKWh,
    totalSecondLifePriceINR,
    newLeadAcidRatePerKWh: newLeadAcidRate,
    totalNewLeadAcidINR,
    newLithiumRatePerKWh: newLithiumRate,
    totalNewLithiumINR,
    savingsVsNewLithiumINR,
    savingsPercentVsNewLithium,
    co2OffsetKg,
    co2OffsetTons,
    citationalNotes: 'Benchmark comparisons use market average procurement rates for commercial pack assemblies in India.'
  };
}

export function generateAggregatedPool() {
  return [
    { grade: 'GRADE_A', totalKWh: 450.0, availablePacks: 128, avgSOH: 84.5, primaryChemistry: 'LFP', targetUse: 'Solar Micro-Grids & BESS', avgPricePerKWh: 5400 },
    { grade: 'GRADE_B', totalKWh: 820.0, availablePacks: 210, avgSOH: 72.8, primaryChemistry: 'NMC', targetUse: 'Telecom Tower Backup', avgPricePerKWh: 4100 },
    { grade: 'GRADE_C', totalKWh: 310.0, availablePacks: 95,  avgSOH: 58.2, primaryChemistry: 'LFP', targetUse: 'Low-Stakes Rural UPS', avgPricePerKWh: 2900 }
  ];
}
