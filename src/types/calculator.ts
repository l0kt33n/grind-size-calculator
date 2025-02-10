export interface GrindSetting {
  rotations: number;
  numbers: number;
  clicks: number;
  microns: number;
}

export interface BrewMethod {
  name: string;
  minMicrons: number;
  maxMicrons: number;
  description: string;
}

export interface GrinderModel {
  id: string;
  name: string;
  adjustmentType: 'Internal' | 'Top' | 'External';
  numbersPerRotation: number;
  clicksPerRotation: number;
  clicksPerNumber: number;
  mmPerClick: number;
  zeroPointMicrons: number;
}

export const GRINDER_MODELS: GrinderModel[] = [
  {
    id: 'q2',
    name: 'Q2 S & J & JE',
    adjustmentType: 'Internal',
    numbersPerRotation: 10,
    clicksPerRotation: 30,
    clicksPerNumber: 3,
    mmPerClick: 0.025,
    zeroPointMicrons: 250
  },
  {
    id: 'jx-pro',
    name: 'JX-Pro S & JE-Plus',
    adjustmentType: 'Top',
    numbersPerRotation: 10,
    clicksPerRotation: 40,
    clicksPerNumber: 4,
    mmPerClick: 0.0125,
    zeroPointMicrons: 200
  },
  {
    id: 'x-pro',
    name: 'X-Pro S & X-Ultra',
    adjustmentType: 'External',
    numbersPerRotation: 6,
    clicksPerRotation: 60,
    clicksPerNumber: 10,
    mmPerClick: 0.0125,
    zeroPointMicrons: 200
  },
  {
    id: 'j-max',
    name: 'J-Max S',
    adjustmentType: 'External',
    numbersPerRotation: 9,
    clicksPerRotation: 90,
    clicksPerNumber: 10,
    mmPerClick: 0.0088,
    zeroPointMicrons: 200
  },
  {
    id: 'j-ultra',
    name: 'J-Ultra',
    adjustmentType: 'External',
    numbersPerRotation: 10,
    clicksPerRotation: 100,
    clicksPerNumber: 10,
    mmPerClick: 0.008,
    zeroPointMicrons: 200
  },
  {
    id: 'k-series',
    name: 'K-Plus & K-Pro & K-Max & ZP6 Special',
    adjustmentType: 'External',
    numbersPerRotation: 9,
    clicksPerRotation: 90,
    clicksPerNumber: 10,
    mmPerClick: 0.022,
    zeroPointMicrons: 200
  },
  {
    id: 'k-ultra',
    name: 'K-Ultra',
    adjustmentType: 'External',
    numbersPerRotation: 10,
    clicksPerRotation: 100,
    clicksPerNumber: 10,
    mmPerClick: 0.02,
    zeroPointMicrons: 200
  }
];

// Default to Q2 S model
export const DEFAULT_MODEL = GRINDER_MODELS[0];

export const MAX_ADJUSTABLE_MICRONS = 1360;

export const BREW_METHODS: BrewMethod[] = [
  {
    name: "Turkish",
    minMicrons: 200,
    maxMicrons: 300,
    description: "Extra fine grind (zero point)"
  },
  {
    name: "Espresso",
    minMicrons: 300,
    maxMicrons: 400,
    description: "Fine grind (around 0.2 rotations)"
  },
  {
    name: "AeroPress/Moka-Pot/Drip",
    minMicrons: 500,
    maxMicrons: 700,
    description: "Medium-fine grind (around 1 rotation)"
  },
  {
    name: "Pour Over/Siphon",
    minMicrons: 800,
    maxMicrons: 1000,
    description: "Medium-coarse grind (around 2 rotations)"
  },
  {
    name: "French Press",
    minMicrons: 1000,
    maxMicrons: 1360,
    description: "Coarse grind (around 3 rotations)"
  }
];

export interface CalibrationPoint {
  rotations: number;
  numbers: number;
  clicks: number;
  measuredMicrons: number;
  timestamp: number;
}

export interface CalibrationData {
  modelId: string;
  points: CalibrationPoint[];
  lastUpdated: number;
}

export const CALIBRATION_POINTS = [
  { name: "Zero Point", description: "Burrs touching - no coffee should pass through", targetRotations: 0, targetNumbers: 0, targetClicks: 0 },
  { name: "Espresso", description: "Fine espresso grind", targetRotations: 0, targetNumbers: 8, targetClicks: 0 },
  { name: "Pour Over", description: "Medium grind for filter coffee", targetRotations: 2, targetNumbers: 0, targetClicks: 0 },
  { name: "French Press", description: "Coarse grind", targetRotations: 3, targetNumbers: 5, targetClicks: 0 },
]; 