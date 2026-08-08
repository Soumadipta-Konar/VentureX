'use strict';

export const VEHICLE_SPECS = {
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
