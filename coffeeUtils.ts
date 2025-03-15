/**
 * Coffee Grinder Utility for NextJS
 * 
 * This file demonstrates how to use the exported coffee grinder data
 * in a NextJS application written in TypeScript.
 * 
 * The exported JSON data structure:
 * {
 *   "grinders": [
 *     {
 *       "id": 1,
 *       "name": "Grinder Name",
 *       "min_microns": 200.0,
 *       "max_microns": 1200.0,
 *       "url": "https://example.com/grinder",
 *       "brew_methods": [
 *         {
 *           "id": 1,
 *           "grinder_id": 1,
 *           "method_name": "Method Name",
 *           "start_microns": 300.0,
 *           "end_microns": 600.0,
 *           "start_setting": "10",
 *           "end_setting": "15",
 *           "setting_format": "simple",
 *           "grind_category": "Medium Fine"
 *         }
 *       ]
 *     }
 *   ],
 *   "metadata": {
 *     "total_grinders": 10,
 *     "is_subset": true,
 *     "grinder_limit": 5,
 *     "methods_limit": 5
 *   }
 * }
 * 
 * This utility provides functions to:
 * 1. Load and cache the coffee data
 * 2. Format grinder settings for display
 * 3. Determine grind categories based on micron size
 * 4. Map micron values to grinder settings using interpolation
 * 5. Query the data to find optimal settings for target micron sizes
 */

// Type definitions for the coffee grinder data
export enum GrindCategory {
    ExtraFine = 'Extra Fine',
    Fine = 'Fine',
    MediumFine = 'Medium Fine',
    Medium = 'Medium',
    MediumCoarse = 'Medium Coarse',
    Coarse = 'Coarse',
    ExtraCoarse = 'Extra Coarse'
  }
  
  export const GRIND_CATEGORY_RANGES: Record<GrindCategory, [number, number]> = {
    [GrindCategory.ExtraFine]: [0, 200],
    [GrindCategory.Fine]: [200, 400],
    [GrindCategory.MediumFine]: [400, 600],
    [GrindCategory.Medium]: [600, 800],
    [GrindCategory.MediumCoarse]: [800, 1000],
    [GrindCategory.Coarse]: [1000, 1200],
    [GrindCategory.ExtraCoarse]: [1200, 1400]
  };
  
  export type SettingFormat = 'simple' | 'complex';
  
  export interface BrewMethod {
    id: number;
    grinder_id: number;
    method_name: string;
    start_microns: number | null;
    end_microns: number | null;
    start_setting: string | null;
    end_setting: string | null;
    setting_format: SettingFormat;
    grind_category: GrindCategory | null;
  }
  
  export interface Grinder {
    id: number;
    name: string;
    min_microns: number | null;
    max_microns: number | null;
    url: string | null;
    brew_methods: BrewMethod[];
  }
  
  export interface CoffeeData {
    grinders: Grinder[];
    metadata?: {
      total_grinders: number;
      is_subset: boolean;
      grinder_limit: number | null;
      methods_limit: number | null;
    };
  }
  
  export interface QueryResult {
    grinder: Grinder;
    target_microns: number;
    calculated_setting: string | number | null;
    setting_format: SettingFormat;
    grind_category: GrindCategory;
    matching_methods: (BrewMethod & { fit_score?: number })[];
  }
  
  export interface QueryParams {
    grinderName: string;
    targetMicrons: number;
    brewMethod?: string;
  }
  
  /**
   * Load the coffee grinder data from the JSON file
   * This can be imported during build time in NextJS
   */
  let coffeeData: CoffeeData | null = null;
  
  export const loadCoffeeData = async (): Promise<CoffeeData> => {
    if (coffeeData) return coffeeData;
    
    // In a real NextJS app, you would use:
    // import coffeeDataJson from '@/data/coffee_data.json';
    // coffeeData = coffeeDataJson as CoffeeData;
    
    // For demonstration purposes, we'll fetch it:
    try {
      const response = await fetch('/api/coffee-data');
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
      return String(setting); // For complex settings like "1.5.3"
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
    settingFormat: SettingFormat
  ): string | number | null => {
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
      // This is a simplified implementation - the real one would be more complex
      const parseComplexSetting = (s: string | number): [number, number, number, number] => {
        const parts = String(s).split('.');
        if (parts.length === 3) {
          // Format: rotations.numbers.clicks (e.g., "1.5.3")
          const rotations = parseInt(parts[0]);
          const numbers = parseInt(parts[1]);
          const clicks = parseInt(parts[2]);
          const numValue = rotations * 100 + numbers * 10 + clicks;
          return [rotations, numbers, clicks, numValue];
        } else if (parts.length === 2) {
          // Format: rotations.clicks (e.g., "1.5")
          const rotations = parseInt(parts[0]);
          const clicks = parseInt(parts[1]);
          const numValue = rotations * 10 + clicks;
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
        const rotations = Math.floor(targetValue / 100);
        const numbers = Math.floor((targetValue % 100) / 10);
        const clicks = targetValue % 10;
        return `${rotations}.${numbers}.${clicks}`;
      } else if (minParts.length === 2) {
        // Format: rotations.clicks
        const rotations = Math.floor(targetValue / 10);
        const clicks = targetValue % 10;
        return `${rotations}.${clicks}`;
      }
      
      return null;
    }
  };
  
  /**
   * Query for grinder settings based on target micron size
   * Similar functionality to query_microns.sh
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
    
    const { min_microns, max_microns } = grinder;
    
    // Check if the target microns is within the grinder's range
    if (min_microns !== null && max_microns !== null) {
      if (targetMicrons < min_microns || targetMicrons > max_microns) {
        throw new Error(
          `Target micron value ${targetMicrons} is outside the grinder's range (${min_microns}-${max_microns})`
        );
      }
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
    
    // Look through all brew methods to find extreme settings
    for (const method of grinder.brew_methods) {
      const { start_setting, end_setting, setting_format } = method;
      
      if (!start_setting || !end_setting) continue;
      
      if (setting_format === 'simple') {
        try {
          const startVal = typeof start_setting === 'string' ? parseInt(start_setting) : start_setting;
          const endVal = typeof end_setting === 'string' ? parseInt(end_setting) : end_setting;
          
          if (minSetting === null || startVal < (minSetting as number)) {
            minSetting = startVal;
          }
          if (maxSetting === null || endVal > (maxSetting as number)) {
            maxSetting = endVal;
          }
        } catch (e) {
          continue;
        }
      } else if (setting_format === 'complex') {
        // For complex settings like "1.5.3", we would need to compare them numerically
        // This is simplified here
        settingFormat = 'complex';
        
        if (minSetting === null) {
          minSetting = start_setting;
        }
        if (maxSetting === null) {
          maxSetting = end_setting;
        }
      }
    }
    
    // If we don't have matching methods, try using standard brew methods
    if (matchingMethods.length === 0) {
      // In a real implementation, you would have standard brew methods defined
      // similar to the STANDARD_BREW_METHODS in the Python code
      
      // This is a placeholder - you would need to fill in your own standard brew methods
      const STANDARD_BREW_METHODS = {
        turkish: { name: "Turkish", min_microns: 40, max_microns: 220, grind_category: "Extra Fine" },
        espresso: { name: "Espresso", min_microns: 180, max_microns: 380, grind_category: "Fine" },
        // Add more standard methods here...
      };
      
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
      
      // Add specialty bonuses for certain methods (similar to the Python code)
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
      min_microns !== null && 
      max_microns !== null
    ) {
      calculatedSetting = mapMicronsToSetting(
        targetMicrons,
        minSetting,
        maxSetting,
        min_microns,
        max_microns,
        settingFormat
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
  
  /**
   * Example usage in a Next.js component:
   * 
   * ```tsx
   * import { useEffect, useState } from 'react';
   * import { queryMicrons, QueryResult, formatSetting } from '@/utils/coffee-utils';
   * 
   * export default function GrinderCalculator() {
   *   const [grinder, setGrinder] = useState('Baratza Encore');
   *   const [microns, setMicrons] = useState(500);
   *   const [result, setResult] = useState<QueryResult | null>(null);
   *   const [loading, setLoading] = useState(false);
   *   const [error, setError] = useState<string | null>(null);
   * 
   *   const handleQuery = async () => {
   *     try {
   *       setLoading(true);
   *       setError(null);
   *       const queryResult = await queryMicrons({
   *         grinderName: grinder,
   *         targetMicrons: microns
   *       });
   *       setResult(queryResult);
   *     } catch (err) {
   *       setError(err.message);
   *     } finally {
   *       setLoading(false);
   *     }
   *   };
   * 
   *   return (
   *     <div className="p-4">
   *       <h1 className="text-2xl font-bold mb-4">Coffee Grinder Calculator</h1>
   *       
   *       <div className="mb-4">
   *         <label className="block mb-2">Grinder</label>
   *         <input
   *           type="text"
   *           value={grinder}
   *           onChange={(e) => setGrinder(e.target.value)}
   *           className="border p-2 w-full"
   *         />
   *       </div>
   *       
   *       <div className="mb-4">
   *         <label className="block mb-2">Target Microns</label>
   *         <input
   *           type="number"
   *           value={microns}
   *           onChange={(e) => setMicrons(parseInt(e.target.value))}
   *           className="border p-2 w-full"
   *         />
   *       </div>
   *       
   *       <button
   *         onClick={handleQuery}
   *         className="bg-blue-500 text-white px-4 py-2 rounded"
   *         disabled={loading}
   *       >
   *         {loading ? 'Loading...' : 'Calculate'}
   *       </button>
   *       
   *       {error && (
   *         <div className="text-red-500 mt-4">{error}</div>
   *       )}
   *       
   *       {result && (
   *         <div className="mt-6">
   *           <h2 className="text-xl font-bold">{result.grinder.name}</h2>
   *           <p>Target: {result.target_microns} microns ({result.grind_category})</p>
   *           <p>Setting: {formatSetting(result.calculated_setting, result.setting_format)}</p>
   *           
   *           <h3 className="text-lg font-bold mt-4">Recommended Brew Methods</h3>
   *           <ul className="mt-2">
   *             {result.matching_methods.slice(0, 3).map((method, idx) => (
   *               <li key={idx} className="mb-2">
   *                 <span className="font-bold">
   *                   {idx === 0 ? '★ Ideal: ' : '☆ Alternative: '}
   *                   {method.method_name}
   *                 </span> 
   *                 ({method.start_microns} - {method.end_microns} microns)
   *               </li>
   *             ))}
   *           </ul>
   *         </div>
   *       )}
   *     </div>
   *   );
   * }
   * ```
   */ 