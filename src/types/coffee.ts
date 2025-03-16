/**
 * Type definitions for the coffee grinder data
 */

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