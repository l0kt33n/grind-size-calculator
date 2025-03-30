import { v4 as uuidv4 } from 'uuid';
import { Recipe, Step, CustomRecipeParams, StepType, CustomizationOptions } from '@/types/recipe';

// Default timing constants
const DEFAULT_BLOOM_TIME = 45; // seconds
const DEFAULT_POUR_TIME = 15; // seconds
const DEFAULT_INTERVAL_BETWEEN_POURS = 15; // seconds
const DEFAULT_DRAWDOWN_TIME = 60; // seconds

/**
 * Format seconds to mm:ss format
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Parse time string (mm:ss) to seconds
 */
export const parseTimeToSeconds = (timeStr: string): number => {
  const [mins, secs] = timeStr.split(':').map(Number);
  return mins * 60 + secs;
};

/**
 * Create a step object with proper ID and timing
 */
export const createStep = (
  type: StepType,
  targetTimeInSeconds: number,
  targetWeight: number,
  targetRatio: number,
  instruction: string,
  description?: string
): Step => {
  return {
    id: uuidv4(),
    type,
    targetTime: formatTime(targetTimeInSeconds),
    targetTimeInSeconds,
    targetWeight,
    targetRatio,
    instruction,
    description,
  };
};

/**
 * Create a custom recipe based on user inputs
 */
export const createCustomRecipe = (params: CustomRecipeParams): Recipe => {
  const { 
    pours, 
    bloomMultiplier = 3, 
    mode = 'basic', 
    inputMode = 'coffee',
    totalBrewTimeSeconds = DEFAULT_BLOOM_TIME + (pours * (DEFAULT_POUR_TIME + DEFAULT_INTERVAL_BETWEEN_POURS)) + DEFAULT_DRAWDOWN_TIME,
    waterTemperature,
    temperatureUnit = 'C'
  } = params;
  
  // Calculate coffee/water weights based on inputMode
  let coffeeWeight: number;
  let waterWeight: number;
  
  if (inputMode === 'coffee') {
    coffeeWeight = params.coffeeWeight || 20; // Default to 20g if undefined
    waterWeight = coffeeWeight * params.ratio;
  } else { // inputMode === 'water'
    waterWeight = params.waterWeight || 320; // Default to 320g if undefined
    coffeeWeight = Math.round(waterWeight / params.ratio);
  }
  
  const ratio = params.ratio;
  
  // Calculate bloom water amount
  const bloomWater = Math.round(coffeeWeight * bloomMultiplier);
  const bloomRatio = bloomMultiplier; // Ratio to coffee weight
  
  // Create steps
  let steps: Step[] = [];
  
  if (mode === 'basic') {
    // Basic mode with even water distribution and timing
    steps = createBasicModeSteps({
      waterWeight,
      bloomWater,
      bloomRatio,
      pours,
      totalBrewTimeSeconds,
      waterTemperature,
      temperatureUnit
    });
  } else if (mode === 'advanced' && params.advancedSteps) {
    // Advanced mode with custom pour steps
    steps = params.advancedSteps;
  } else {
    // Fallback to standard step creation (legacy behavior)
    steps = createLegacySteps({
      waterWeight,
      bloomWater,
      bloomRatio,
      pours
    });
  }
  
  // Get the total brew time from the last step
  const lastStep = steps[steps.length - 1];
  const totalBrewTime = lastStep.targetTimeInSeconds + DEFAULT_DRAWDOWN_TIME;
  
  return {
    id: uuidv4(),
    name: `Custom ${coffeeWeight}g:${waterWeight}g (1:${ratio})`,
    coffeeWeight,
    waterWeight,
    ratio,
    bloomMultiplier,
    pours,
    steps,
    totalBrewTime,
    mode,
    inputMode,
    waterTemperature,
    temperatureUnit
  };
};

/**
 * Helper function to create steps for the legacy behavior
 */
const createLegacySteps = ({
  waterWeight,
  bloomWater,
  bloomRatio,
  pours
}: {
  waterWeight: number;
  bloomWater: number;
  bloomRatio: number;
  pours: number;
}): Step[] => {
  const steps: Step[] = [];
  let currentTime = 0;
  
  // Calculate remaining water and pour distribution
  const remainingWater = waterWeight - bloomWater;
  const waterPerPour = Math.round(remainingWater / pours);
  const pourRatio = remainingWater / pours / waterWeight; // Ratio to total water
  
  // Add bloom step
  steps.push(
    createStep(
      'bloom',
      currentTime,
      bloomWater,
      bloomRatio,
      `Pour ${bloomWater}g of water to bloom the coffee grounds`
    )
  );
  
  // Update current time after bloom
  currentTime += DEFAULT_BLOOM_TIME;
  
  // Add pour steps
  for (let i = 0; i < pours; i++) {
    steps.push(
      createStep(
        'pour',
        currentTime,
        waterPerPour,
        pourRatio,
        `Pour ${waterPerPour}g of water in a circular motion`
      )
    );
    
    // Update time for next pour
    currentTime += DEFAULT_POUR_TIME + DEFAULT_INTERVAL_BETWEEN_POURS;
  }
  
  // Add drawdown step
  steps.push(
    createStep(
      'drawdown',
      currentTime,
      0,
      0,
      'Allow remaining water to drain through the coffee bed'
    )
  );
  
  return steps;
};

/**
 * Helper function to create steps for the basic mode with even distribution
 */
const createBasicModeSteps = ({
  waterWeight,
  bloomWater,
  bloomRatio,
  pours,
  totalBrewTimeSeconds,
  waterTemperature,
  temperatureUnit
}: {
  waterWeight: number;
  bloomWater: number;
  bloomRatio: number;
  pours: number;
  totalBrewTimeSeconds: number;
  waterTemperature?: number;
  temperatureUnit?: string;
}): Step[] => {
  const steps: Step[] = [];
  
  // Fixed bloom duration
  const bloomDuration = DEFAULT_BLOOM_TIME;
  
  // Calculate remaining time and water after bloom
  const remainingTime = totalBrewTimeSeconds - bloomDuration - DEFAULT_DRAWDOWN_TIME;
  const remainingWater = waterWeight - bloomWater;
  
  // Calculate time per pour interval and water per pour
  const timePerPourInterval = pours > 0 ? Math.floor(remainingTime / pours) : 0;
  const waterPerPour = pours > 0 ? Math.round(remainingWater / pours) : 0;
  const pourRatio = remainingWater / pours / waterWeight; // Ratio to total water
  
  // Format temperature for instruction text
  const tempText = waterTemperature ? ` (${waterTemperature}°${temperatureUnit || 'C'})` : '';
  
  // Add bloom step
  steps.push(
    createStep(
      'bloom',
      0, // Start at time 0
      bloomWater,
      bloomRatio,
      `Pour ${bloomWater}g of water${tempText} to bloom the coffee grounds`,
      'Ensure all grounds are saturated. Gently swirl if needed.' // Default description for bloom
    )
  );
  
  // Set current time to end of bloom
  let currentTime = bloomDuration;
  let currentWater = bloomWater;
  
  // Add pour steps with calculated timing
  for (let i = 0; i < pours; i++) {
    currentWater += waterPerPour;
    const pourNumber = i + 1;
    
    steps.push(
      createStep(
        'pour',
        currentTime,
        waterPerPour,
        pourRatio,
        `Pour ${waterPerPour}g of water in a circular motion (total: ${currentWater}g)`,
        `Pour ${pourNumber} of ${pours}: maintain a steady, slow pour rate to evenly extract the coffee.` // Default description for pour
      )
    );
    
    // Update time for next pour
    currentTime += timePerPourInterval;
  }
  
  // Add drawdown step
  steps.push(
    createStep(
      'drawdown',
      currentTime,
      0,
      0,
      'Allow remaining water to drain through the coffee bed',
      'Total brew time should finish in about 1 minute from drawdown start.' // Default description for drawdown
    )
  );
  
  return steps;
};

/**
 * Calculate step weights based on water weight and recipe ratios
 */
export const calculateRecipeWithCustomWater = (recipe: Recipe, options: CustomizationOptions): Recipe => {
  const { waterWeight: customWaterWeight } = options;
  const adjustedCoffeeWeight = Math.round(customWaterWeight / recipe.ratio);
  
  // First create a basic structure without complex replacements
  const customizedRecipe: Recipe = {
    ...recipe,
    id: uuidv4(), // Generate new ID for the customized recipe
    coffeeWeight: adjustedCoffeeWeight,
    waterWeight: customWaterWeight,
    steps: recipe.steps.map(step => {
      if (step.type === 'bloom') {
        // For bloom, calculate based on coffee weight and bloom ratio
        const bloomWeight = Math.round(adjustedCoffeeWeight * step.targetRatio);
        return {
          ...step,
          id: uuidv4(),
          targetWeight: bloomWeight,
          instruction: step.instruction.replace(/\d+g/, `${bloomWeight}g`)
        };
      } else if (step.type === 'pour') {
        // For pour steps, calculate based on total water weight and pour ratio
        const pourWeight = Math.round(customWaterWeight * step.targetRatio);
        return {
          ...step,
          id: uuidv4(),
          targetWeight: pourWeight,
          instruction: step.instruction.replace(/\d+g/, `${pourWeight}g`) // Only replace the pour amount for now
        };
      } else {
        // For drawdown, just copy the step
        return {
          ...step,
          id: uuidv4()
        };
      }
    })
  };
  
  // Now update the instruction texts with running totals in a second pass
  customizedRecipe.steps = customizedRecipe.steps.map((step, index) => {
    if (step.type === 'pour') {
      // For pour steps, update the "reach X total" text
      const runningTotal = getRunningTotal(customizedRecipe.steps, index);
      return {
        ...step,
        instruction: step.instruction.replace(/reach \d+g/, `reach ${Math.round(runningTotal)}g`)
      };
    }
    return step;
  });
  
  return customizedRecipe;
};

/**
 * Helper function to calculate running total for instruction text
 */
function getRunningTotal(steps: Step[], currentStepIndex: number): number {
  let total = 0;
  
  for (let i = 0; i <= currentStepIndex; i++) {
    if (steps[i].type !== 'drawdown') {
      total += steps[i].targetWeight;
    }
  }
  
  return total;
}

/**
 * Predefined V60 recipes
 */
export const predefinedRecipes: Recipe[] = [
  // Low-Key Coffee Snobs Recipe
  {
    id: uuidv4(),
    name: "Low-Key Coffee Snobs V60",
    source: "Low-Key Coffee Snobs",
    coffeeWeight: 18,
    waterWeight: 288,
    ratio: 16,
    bloomMultiplier: 3,
    pours: 3,
    totalBrewTime: 180, // 3 minutes
    steps: [
      {
        id: uuidv4(),
        type: 'bloom',
        targetTime: '0:00',
        targetTimeInSeconds: 0,
        targetWeight: 54,
        targetRatio: 3, // 3x coffee weight
        instruction: 'Pour 54g of water to bloom the coffee grounds and gently swirl',
      },
      {
        id: uuidv4(),
        type: 'pour',
        targetTime: '0:45',
        targetTimeInSeconds: 45,
        targetWeight: 78,
        targetRatio: 78/288, // ~27% of total water
        instruction: 'Pour slowly in circular motion until you reach 132g total',
      },
      {
        id: uuidv4(),
        type: 'pour',
        targetTime: '1:15',
        targetTimeInSeconds: 75,
        targetWeight: 78,
        targetRatio: 78/288, // ~27% of total water
        instruction: 'Pour slowly in circular motion until you reach 210g total',
      },
      {
        id: uuidv4(),
        type: 'pour',
        targetTime: '1:45',
        targetTimeInSeconds: 105,
        targetWeight: 78,
        targetRatio: 78/288, // ~27% of total water
        instruction: 'Pour slowly in circular motion until you reach 288g total',
      },
      {
        id: uuidv4(),
        type: 'drawdown',
        targetTime: '2:15',
        targetTimeInSeconds: 135,
        targetWeight: 0,
        targetRatio: 0,
        instruction: 'Allow coffee to drawdown, should finish around 3:00',
      },
    ],
  },
  
  // Joe Coffee Recipe
  {
    id: uuidv4(),
    name: "Joe Coffee V60",
    source: "Joe Coffee Guide",
    coffeeWeight: 25,
    waterWeight: 400,
    ratio: 16,
    bloomMultiplier: 2,
    pours: 2,
    totalBrewTime: 195, // 3:15 minutes
    steps: [
      {
        id: uuidv4(),
        type: 'bloom',
        targetTime: '0:00',
        targetTimeInSeconds: 0,
        targetWeight: 50,
        targetRatio: 2, // 2x coffee weight
        instruction: 'Pour 50g of water to bloom the coffee grounds',
      },
      {
        id: uuidv4(),
        type: 'pour',
        targetTime: '0:45',
        targetTimeInSeconds: 45,
        targetWeight: 175,
        targetRatio: 175/400, // 43.75% of total water
        instruction: 'Pour in slow spirals until you reach 225g total',
      },
      {
        id: uuidv4(),
        type: 'pour',
        targetTime: '1:30',
        targetTimeInSeconds: 90,
        targetWeight: 175,
        targetRatio: 175/400, // 43.75% of total water
        instruction: 'Pour in slow spirals until you reach 400g total',
      },
      {
        id: uuidv4(),
        type: 'drawdown',
        targetTime: '2:15',
        targetTimeInSeconds: 135,
        targetWeight: 0,
        targetRatio: 0,
        instruction: 'Allow coffee to drawdown, should finish around 3:15',
      },
    ],
  },
  
  // Tag Coffee Recipe
  {
    id: uuidv4(),
    name: "Tag Coffee V60 (Large Batch)",
    source: "Tag Coffee Brew Guide",
    coffeeWeight: 42,
    waterWeight: 700,
    ratio: 16.7,
    bloomMultiplier: 2.1,
    pours: 3,
    totalBrewTime: 210, // 3:30 minutes
    steps: [
      {
        id: uuidv4(),
        type: 'bloom',
        targetTime: '0:00',
        targetTimeInSeconds: 0,
        targetWeight: 90,
        targetRatio: 2.1, // 2.1x coffee weight
        instruction: 'Pour 90g of water to bloom and gently swirl to saturate all grounds',
      },
      {
        id: uuidv4(),
        type: 'pour',
        targetTime: '0:45',
        targetTimeInSeconds: 45,
        targetWeight: 200,
        targetRatio: 200/700, // ~28.6% of total water
        instruction: 'Aggressive center pour until you reach 290g total',
      },
      {
        id: uuidv4(),
        type: 'pour',
        targetTime: '1:15',
        targetTimeInSeconds: 75,
        targetWeight: 200,
        targetRatio: 200/700, // ~28.6% of total water
        instruction: 'Aggressive center pour until you reach 490g total',
      },
      {
        id: uuidv4(),
        type: 'pour',
        targetTime: '1:45',
        targetTimeInSeconds: 105,
        targetWeight: 210,
        targetRatio: 210/700, // 30% of total water
        instruction: 'Final pour reaching 700g total',
      },
      {
        id: uuidv4(),
        type: 'drawdown',
        targetTime: '2:15',
        targetTimeInSeconds: 135,
        targetWeight: 0,
        targetRatio: 0,
        instruction: 'Allow coffee to drawdown, should finish around 3:30',
      },
    ],
  },
  
  // Stumptown Coffee Recipe
  {
    id: uuidv4(),
    name: "Stumptown Coffee V60",
    source: "Stumptown Coffee Roasters",
    coffeeWeight: 22,
    waterWeight: 352,
    ratio: 16,
    bloomMultiplier: 2.5,
    pours: 2,
    totalBrewTime: 180, // 3:00 minutes
    steps: [
      {
        id: uuidv4(),
        type: 'bloom',
        targetTime: '0:00',
        targetTimeInSeconds: 0,
        targetWeight: 55,
        targetRatio: 2.5, // 2.5x coffee weight
        instruction: 'Pour 55g of water and gently stir to ensure all grounds are saturated',
      },
      {
        id: uuidv4(),
        type: 'pour',
        targetTime: '0:40',
        targetTimeInSeconds: 40,
        targetWeight: 150,
        targetRatio: 150/352, // ~42.6% of total water
        instruction: 'Pour slowly in concentric circles until you reach 205g total',
      },
      {
        id: uuidv4(),
        type: 'pour',
        targetTime: '1:20',
        targetTimeInSeconds: 80,
        targetWeight: 147,
        targetRatio: 147/352, // ~41.8% of total water
        instruction: 'Final pour to reach 352g total',
      },
      {
        id: uuidv4(),
        type: 'drawdown',
        targetTime: '2:00',
        targetTimeInSeconds: 120,
        targetWeight: 0,
        targetRatio: 0,
        instruction: 'Allow coffee to drawdown, should finish around 3:00',
      },
    ],
  },
]; 