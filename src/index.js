'use strict';

import { VEHICLE_SPECS } from './config/vehicleSpecs.js';
import { CHEMISTRY_CONFIG } from './config/chemistryConfig.js';
import { MARKET_BENCHMARKS } from './config/marketBenchmarks.js';
import { deriveCyclesFromKm, calculateProvisionalSOH } from './engine/degradationModel.js';
import { calculateVerifiedSOH } from './engine/physicalVerification.js';
import { determineGrade, getWarrantyStructure } from './engine/gradingAndWarranty.js';
import { calculateSellerPayout, calculateB2BPricing, generateAggregatedPool } from './engine/valuationEngine.js';

export {
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

// Export to window global for browser runtime
if (typeof window !== 'undefined') {
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
