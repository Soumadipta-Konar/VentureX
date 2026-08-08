'use strict';

export const CHEMISTRY_CONFIG = {
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
