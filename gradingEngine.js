'use strict';

const VEHICLE_SPECS = {
  '2W': {
    name: '2-Wheeler (e.g., Ather 450X, Ola S1 Pro, TVS iQube)',
    defaultCapacityKWh: 3.5,
    kmPerCycle: 40,
    nominalVoltage: 51.2,
  },
  '3W': {
    name: '3-Wheeler / E-Rikshaw (e.g., Mahindra Treo, Piaggio Ape E)',
    defaultCapacityKWh: 7.5,
    kmPerCycle: 55,
    nominalVoltage: 48.0,
  },
  '4W': {
    name: '4-Wheeler Passenger/Fleet (e.g., Tata Nexon EV, MG ZS EV)',
    defaultCapacityKWh: 30.0,
    kmPerCycle: 120,
    nominalVoltage: 320.0,
  }
};

const CHEMISTRY_CONFIG = {
  LFP: {
    name: 'Lithium Iron Phosphate (LFP)',
    description: 'Flatter degradation curve, longer cycle life, high thermal stability.',
    nominalCycleLife: 2800,
    calendarDecayPerYear: 0.012,
    cycleAlpha: 0.85,
    tempSensitivity: 0.025,
    virginCellPricePerKWh: 11500,
  },
  NMC: {
    name: 'Nickel Manganese Cobalt (NMC)',
    description: 'Higher energy density, steeper degradation slope, sensitive to heat.',
    nominalCycleLife: 1600,
    calendarDecayPerYear: 0.022,
    cycleAlpha: 0.95,
    tempSensitivity: 0.045,
    virginCellPricePerKWh: 13500,
  }
};

const MARKET_BENCHMARKS = {
  informalScrapRatePerKWh: 1450,
  eprCreditPerKWh: {
    LFP: 520,
    NMC: 680,
  },
  newLeadAcidPricePerKWh: 5200,
  newLithiumPricePerKWh: 12500,
  co2OffsetKgPerKWh: 85,
};

function deriveCyclesFromKm(category, odometerKm) {
  const spec = VEHICLE_SPECS[category] || VEHICLE_SPECS['2W'];
  if (!odometerKm || odometerKm <= 0) return 0;
  return Math.round(odometerKm / spec.kmPerCycle);
}

function calculateProvisionalSOH(params) {
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

function calculateVerifiedSOH(provisionalResult, inspectionData) {
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

function determineGrade(soh) {
  if (soh > 80) {
    return {
      grade: 'GRADE_A',
      name: 'Grade A (High Performance Second-Life)',
      shortName: 'Grade A (>80% SOH)',
      application: 'Commercial Energy Storage Systems (BESS), Solar Micro-grids, EV Charging Station Buffer',
      badgeColor: '#059669',
      badgeBg: '#d1fae5',
      badgeText: '#065f46',
    };
  } else if (soh >= 65) {
    return {
      grade: 'GRADE_B',
      name: 'Grade B (Standard Second-Life)',
      shortName: 'Grade B (65-80% SOH)',
      application: 'Telecom Tower Backup Power, Agritech Solar Water Pumps, Industrial Stationary Backups',
      badgeColor: '#0284c7',
      badgeBg: '#e0f2fe',
      badgeText: '#0369a1',
    };
  } else if (soh >= 50) {
    return {
      grade: 'GRADE_C',
      name: 'Grade C (Low-Stakes Second-Life)',
      shortName: 'Grade C (50-65% SOH)',
      application: 'Low-Stakes Emergency UPS, Off-Grid Rural Lighting, Low-Speed Agricultural Utility',
      badgeColor: '#d97706',
      badgeBg: '#fef3c7',
      badgeText: '#92400e',
    };
  } else {
    return {
      grade: 'REJECT',
      name: 'Reject (Recycling & Material Extraction)',
      shortName: 'Reject (<50% SOH)',
      application: 'Black Mass Hydrometallurgical Recycling (Cobalt, Lithium, Nickel Recovery)',
      badgeColor: '#dc2626',
      badgeBg: '#fee2e2',
      badgeText: '#991b1b',
    };
  }
}

function getWarrantyStructure(grade) {
  switch (grade) {
    case 'GRADE_A':
      return {
        durationMonths: 36,
        type: 'Prorated Performance-Linked Coverage',
        capacityGuaranteePercent: 70,
        terms: '36-Month Prorated Warranty. Guaranteed >=70% remaining capacity. Includes free remote cell monitoring gateway.',
        riskLevel: 'Low (Institutional Grade)'
      };
    case 'GRADE_B':
      return {
        durationMonths: 18,
        type: 'Standard Prorated Coverage',
        capacityGuaranteePercent: 55,
        terms: '18-Month Prorated Warranty. Guaranteed >=55% remaining capacity. Swap module guaranteed within 72 hours.',
        riskLevel: 'Medium (Managed Industrial)'
      };
    case 'GRADE_C':
      return {
        durationMonths: 3,
        type: 'As-Is / 90-Day Replacement Only',
        capacityGuaranteePercent: 45,
        terms: 'Sold As-Is with 90-Day Dead-on-Arrival (DOA) replacement warranty. No long-term capacity retention guarantee.',
        riskLevel: 'Elevated (Low-Stakes Backup Only)'
      };
    case 'REJECT':
    default:
      return {
        durationMonths: 0,
        type: 'Recycling Clearance Certificate',
        capacityGuaranteePercent: 0,
        terms: 'No second-life operational warranty. Issued official Safe Recycling & EPR Transfer Clearance Certificate.',
        riskLevel: 'Recycling Only'
      };
  }
}

function calculateSellerPayout(params) {
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

function calculateB2BPricing(params) {
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

function generateAggregatedPool() {
  return [
    { grade: 'GRADE_A', totalKWh: 450.0, availablePacks: 128, avgSOH: 84.5, primaryChemistry: 'LFP', targetUse: 'Solar Micro-Grids & BESS', avgPricePerKWh: 5400 },
    { grade: 'GRADE_B', totalKWh: 820.0, availablePacks: 210, avgSOH: 72.8, primaryChemistry: 'NMC', targetUse: 'Telecom Tower Backup', avgPricePerKWh: 4100 },
    { grade: 'GRADE_C', totalKWh: 310.0, availablePacks: 95,  avgSOH: 58.2, primaryChemistry: 'LFP', targetUse: 'Low-Stakes Rural UPS', avgPricePerKWh: 2900 }
  ];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VEHICLE_SPECS,
    CHEMISTRY_CONFIG,
    MARKET_BENCHMARKS,
    deriveCyclesFromKm,
    calculateProvisionalSOH,
    calculateVerifiedSOH,
    determineGrade,
    getWarrantyStructure,
    calculateSellerPayout,
    calculateB2BPricing,
    generateAggregatedPool
  };
} else if (typeof window !== 'undefined') {
  window.GradingEngine = {
    VEHICLE_SPECS,
    CHEMISTRY_CONFIG,
    MARKET_BENCHMARKS,
    deriveCyclesFromKm,
    calculateProvisionalSOH,
    calculateVerifiedSOH,
    determineGrade,
    getWarrantyStructure,
    calculateSellerPayout,
    calculateB2BPricing,
    generateAggregatedPool
  };
}
