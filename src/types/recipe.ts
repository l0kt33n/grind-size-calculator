export type StepType = 'bloom' | 'pour' | 'drawdown';

export interface Step {
  id: string;
  type: StepType;
  targetTime: string; // Format: "0:45"
  targetTimeInSeconds: number; // For easier calculations
  targetWeight: number; // Water to pour for this step in grams
  targetRatio: number; // Ratio of this step to coffee weight (for bloom) or to total water (for pours)
  instruction: string; // Text prompt for the user
}

export interface Recipe {
  id: string;
  name: string;
  source?: string; // Optional source of the recipe
  coffeeWeight: number; // Default weight of coffee in grams
  waterWeight: number; // Default total water weight
  ratio: number; // Coffee-to-water ratio (e.g., 16 for 1:16)
  bloomMultiplier: number; // Factor for bloom water (default 3)
  pours: number; // Number of subsequent pours (not including bloom)
  steps: Step[]; // Array of Step objects
  totalBrewTime: number; // Total brew time in seconds
}

export interface CustomRecipeParams {
  coffeeWeight: number;
  ratio: number;
  pours: number;
  bloomMultiplier?: number; // Optional with default value
}

export interface CustomizationOptions {
  waterWeight: number;
} 