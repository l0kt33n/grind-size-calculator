/**
 * Coffee Grinder Utility Functions
 * 
 * This file provides utilities to:
 * 1. Load and cache the coffee data
 * 2. Format grinder settings for display
 * 3. Determine grind categories based on micron size
 * 4. Map micron values to grinder settings using interpolation
 * 5. Query the data to find optimal settings for target micron sizes
 */

import { 
  CoffeeData, 
  GrindCategory, 
  GRIND_CATEGORY_RANGES, 
  QueryParams, 
  QueryResult, 
  SettingFormat 
} from "@/types/coffee";

// Cache the coffee data
let coffeeData: CoffeeData | null = null;

/**
 * Load the coffee grinder data from the JSON file
 */
export const loadCoffeeData = async (): Promise<CoffeeData> => {
  if (coffeeData) return coffeeData;
  
  try {
    // In test environment, use the imported data
    if (typeof window === 'undefined') {
      coffeeData = (await import('../../public/grinderData.json')).default as CoffeeData;
      return coffeeData;
    }
    
    // In browser environment, fetch the data
    const response = await fetch('/grinderData.json');
    coffeeData = await response.json() as CoffeeData;
    return coffeeData;
  } catch (error) {
    console.error('Failed to load coffee data:', error);
    throw error;
  }
};

/**
 * Format a grinder setting for display
 */
export const formatSetting = (setting: string | number | null, format: SettingFormat): string => {
  if (setting === null) return 'Unknown';
  
  if (format === 'simple') {
    return `${setting} clicks`;
  } else {
    // For complex settings like "1.5.3", we need to handle different clicks per number
    const parts = String(setting).split('.');
    if (parts.length === 3) {
      // Format: rotations.numbers.clicks
      const rotations = parseInt(parts[0]);
      const numbers = parseInt(parts[1]);
      const clicks = parseInt(parts[2]);
      return `${rotations}.${numbers}.${clicks}`;
    } else if (parts.length === 2) {
      // Format: rotations.clicks
      const rotations = parseInt(parts[0]);
      const clicks = parseInt(parts[1]);
      return `${rotations}.${clicks}`;
    }
    return String(setting);
  }
};

/**
 * Determine the grind category for a given micron size
 */
export const getGrindCategory = (microns: number): GrindCategory => {
  for (const [category, [min, max]] of Object.entries(GRIND_CATEGORY_RANGES)) {
    if (microns >= min && microns < max) {
      return category as GrindCategory;
    }
  }
  
  // Default for values outside defined ranges
  if (microns < GRIND_CATEGORY_RANGES[GrindCategory.ExtraFine][0]) {
    return GrindCategory.ExtraFine;
  }
  return GrindCategory.ExtraCoarse;
};

/**
 * Map a micron value to a grinder setting using linear interpolation
 */
export const mapMicronsToSetting = (
  microns: number,
  minSetting: string | number,
  maxSetting: string | number,
  minMicrons: number,
  maxMicrons: number,
  settingFormat: SettingFormat,
  clicksPerNumber: number = 10
): string | number | null => {
  // Handle edge cases
  if (microns <= minMicrons) return minSetting;
  if (microns >= maxMicrons) return maxSetting;
  
  // Calculate what proportion of the micron range this value is
  const micronRange = maxMicrons - minMicrons;
  if (micronRange <= 0) return null;
  
  const ratio = (microns - minMicrons) / micronRange;
  
  if (settingFormat === 'simple') {
    // For simple settings (clicks), convert to number
    const minSettingNum = typeof minSetting === 'string' ? parseInt(minSetting) : minSetting;
    const maxSettingNum = typeof maxSetting === 'string' ? parseInt(maxSetting) : maxSetting;
    
    const settingRange = maxSettingNum - minSettingNum;
    return Math.round(minSettingNum + (ratio * settingRange));
  } else {
    // For complex settings like "1.5.3", we need to parse them
    const parseComplexSetting = (s: string | number): [number, number, number, number] => {
      const parts = String(s).split('.');
      if (parts.length === 3) {
        // Format: rotations.numbers.clicks
        const rotations = parseInt(parts[0]);
        const numbers = parseInt(parts[1]);
        const clicks = parseInt(parts[2]);
        // Calculate total clicks: (rotations * 10 * clicksPerNumber) + (numbers * clicksPerNumber) + clicks
        const numValue = (rotations * 10 * clicksPerNumber) + (numbers * clicksPerNumber) + clicks;
        return [rotations, numbers, clicks, numValue];
      } else if (parts.length === 2) {
        // Format: rotations.clicks
        const rotations = parseInt(parts[0]);
        const clicks = parseInt(parts[1]);
        // Calculate total clicks: (rotations * 10 * clicksPerNumber) + clicks
        const numValue = (rotations * 10 * clicksPerNumber) + clicks;
        return [rotations, 0, clicks, numValue];
      }
      return [0, 0, 0, 0];
    };
    
    const [, , , minValue] = parseComplexSetting(minSetting);
    const [, , , maxValue] = parseComplexSetting(maxSetting);
    const targetValue = Math.round(minValue + (ratio * (maxValue - minValue)));
    
    // Format based on the pattern of min/max settings
    const minParts = String(minSetting).split('.');
    if (minParts.length === 3) {
      // Format: rotations.numbers.clicks
      const rotations = Math.floor(targetValue / (10 * clicksPerNumber));
      const remainingClicks = targetValue % (10 * clicksPerNumber);
      const numbers = Math.floor(remainingClicks / clicksPerNumber);
      const clicks = remainingClicks % clicksPerNumber;
      return `${rotations}.${numbers}.${clicks}`;
    } else if (minParts.length === 2) {
      // Format: rotations.clicks
      const rotations = Math.floor(targetValue / (10 * clicksPerNumber));
      const clicks = targetValue % (10 * clicksPerNumber);
      return `${rotations}.${clicks}`;
    }
    
    return null;
  }
};

// Standard brew methods to use when no matching methods are found
export const STANDARD_BREW_METHODS: Record<string, { name: string; min_microns: number; max_microns: number; grind_category: string }> = {
  turkish: { name: "Turkish", min_microns: 40, max_microns: 220, grind_category: "Extra Fine" },
  espresso: { name: "Espresso", min_microns: 180, max_microns: 380, grind_category: "Fine" },
  aeropress: { name: "Aeropress", min_microns: 320, max_microns: 960, grind_category: "Medium Fine" },
  pourover: { name: "Pour Over", min_microns: 400, max_microns: 800, grind_category: "Medium" },
  frenchpress: { name: "French Press", min_microns: 800, max_microns: 1200, grind_category: "Coarse" },
  coldbrew: { name: "Cold Brew", min_microns: 800, max_microns: 1600, grind_category: "Coarse" }
};

/**
 * Query for grinder settings based on target micron size
 */
export const queryMicrons = async (params: QueryParams): Promise<QueryResult> => {
  const { grinderName, targetMicrons, brewMethod } = params;
  
  // Load the coffee data if not already loaded
  const data = await loadCoffeeData();
  
  // Find the matching grinder by name (fuzzy match)
  const grinder = data.grinders.find(g => 
    g.name.toLowerCase().includes(grinderName.toLowerCase())
  );
  
  if (!grinder) {
    throw new Error(`No grinder found matching '${grinderName}'`);
  }
  
  // Find matching brew methods
  let matchingMethods = grinder.brew_methods.filter(method => {
    const { start_microns, end_microns, method_name } = method;
    
    // If a specific brew method was requested, filter by it
    if (brewMethod && !method_name.toLowerCase().includes(brewMethod.toLowerCase())) {
      return false;
    }
    
    // Check if the target microns is within this method's range
    return (
      start_microns !== null && 
      end_microns !== null && 
      targetMicrons >= start_microns && 
      targetMicrons <= end_microns
    );
  });
  
  // Find the min and max settings of the grinder
  let minSetting: string | number | null = null;
  let maxSetting: string | number | null = null;
  let settingFormat: SettingFormat = 'simple';
  let minMicrons: number | null = null;
  let maxMicrons: number | null = null;
  
  // If we have matching methods, use their settings
  if (matchingMethods.length > 0) {
    // Use the first matching method's settings
    const method = matchingMethods[0];
    if (method.start_setting && method.end_setting && 
        method.start_microns !== null && method.end_microns !== null) {
      minSetting = method.start_setting;
      maxSetting = method.end_setting;
      settingFormat = method.setting_format;
      minMicrons = method.start_microns;
      maxMicrons = method.end_microns;
    }
  } else {
    // Look through all brew methods to find extreme settings
    for (const method of grinder.brew_methods) {
      const { start_setting, end_setting, setting_format, start_microns, end_microns } = method;
      
      if (!start_setting || !end_setting || start_microns === null || end_microns === null) continue;
      
      if (setting_format === 'simple') {
        try {
          const startVal = typeof start_setting === 'string' ? parseInt(start_setting) : start_setting;
          const endVal = typeof end_setting === 'string' ? parseInt(end_setting) : end_setting;
          
          if (minSetting === null || startVal < (minSetting as number)) {
            minSetting = startVal;
            minMicrons = start_microns;
          }
          if (maxSetting === null || endVal > (maxSetting as number)) {
            maxSetting = endVal;
            maxMicrons = end_microns;
          }
        } catch (e) {
          console.error('Error parsing setting:', e);
          continue;
        }
      } else if (setting_format === 'complex') {
        // For complex settings, use string comparison
        settingFormat = 'complex';
        
        if (minSetting === null) {
          minSetting = start_setting;
          minMicrons = start_microns;
        }
        if (maxSetting === null) {
          maxSetting = end_setting;
          maxMicrons = end_microns;
        }
      }
    }
  }
  
  // If we don't have matching methods, try using standard brew methods
  if (matchingMethods.length === 0) {
    // Check each standard method
    for (const [key, methodData] of Object.entries(STANDARD_BREW_METHODS)) {
      if (
        targetMicrons >= methodData.min_microns && 
        targetMicrons <= methodData.max_microns &&
        (!brewMethod || key.includes(brewMethod.toLowerCase()))
      ) {
        // Create a synthetic brew method
        matchingMethods.push({
          id: -1,  // Synthetic ID
          grinder_id: grinder.id,
          method_name: methodData.name,
          start_microns: methodData.min_microns,
          end_microns: methodData.max_microns,
          start_setting: null,
          end_setting: null,
          setting_format: settingFormat,
          grind_category: methodData.grind_category as GrindCategory
        });
      }
    }
  }
  
  // Calculate score for each method and sort
  matchingMethods = matchingMethods.map(method => {
    const methodMin = method.start_microns || 0;
    const methodMax = method.end_microns || 0;
    const methodRange = methodMax - methodMin;
    const methodMid = methodMin + (methodRange / 2);
    
    // Basic fit score - how centered the target is within the range
    let fitScore = Math.abs(targetMicrons - methodMid) / methodRange;
    
    // Add specialty bonuses for certain methods
    const methodName = method.method_name.toLowerCase();
    if (methodName.includes('v60') && targetMicrons >= 450 && targetMicrons <= 550) {
      fitScore -= 0.3;  // Better fit
    } else if (methodName.includes('espresso') && targetMicrons >= 200 && targetMicrons <= 300) {
      fitScore -= 0.3;
    }
    
    return {
      ...method,
      fit_score: fitScore
    };
  }).sort((a, b) => (a.fit_score || 0) - (b.fit_score || 0));
  
  // Calculate the grind setting for the target micron value
  let calculatedSetting: string | number | null = null;
  if (
    minSetting !== null && 
    maxSetting !== null && 
    minMicrons !== null && 
    maxMicrons !== null
  ) {
    calculatedSetting = mapMicronsToSetting(
      targetMicrons,
      minSetting,
      maxSetting,
      minMicrons,
      maxMicrons,
      settingFormat,
      grinder.clicks_per_number
    );
  }
  
  // Determine the grind category
  const grindCategory = getGrindCategory(targetMicrons);
  
  return {
    grinder,
    target_microns: targetMicrons,
    calculated_setting: calculatedSetting,
    setting_format: settingFormat,
    grind_category: grindCategory,
    matching_methods: matchingMethods
  };
}; 