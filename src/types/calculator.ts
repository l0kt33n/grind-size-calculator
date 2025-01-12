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

export const ZERO_POINT_MICRONS = 250;
export const MICRONS_PER_CLICK = 25;
export const CLICKS_PER_ROTATION = 30;
export const NUMBERS_PER_ROTATION = 10;
export const CLICKS_PER_NUMBER = 3;
export const MICRONS_PER_ROTATION = MICRONS_PER_CLICK * CLICKS_PER_ROTATION;
export const MAX_ADJUSTABLE_MICRONS = 1360 - ZERO_POINT_MICRONS;

export const BREW_METHODS: BrewMethod[] = [
  {
    name: "Turkish",
    minMicrons: ZERO_POINT_MICRONS,
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