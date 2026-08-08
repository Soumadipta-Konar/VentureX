'use strict';

export function determineGrade(soh) {
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

export function getWarrantyStructure(grade) {
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
