import { 
  formatTime, 
  parseTimeToSeconds, 
  createCustomRecipe 
} from './recipe-utils';

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid')
}));

describe('Recipe Utilities', () => {
  describe('formatTime', () => {
    it('formats seconds to mm:ss format correctly', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(45)).toBe('0:45');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(125)).toBe('2:05');
      expect(formatTime(3661)).toBe('61:01'); // Edge case: more than 60 minutes
    });
  });

  describe('parseTimeToSeconds', () => {
    it('converts time strings to seconds correctly', () => {
      expect(parseTimeToSeconds('0:00')).toBe(0);
      expect(parseTimeToSeconds('0:45')).toBe(45);
      expect(parseTimeToSeconds('1:30')).toBe(90);
      expect(parseTimeToSeconds('2:05')).toBe(125);
      expect(parseTimeToSeconds('61:01')).toBe(3661); // Edge case: more than 60 minutes
    });
  });

  describe('createCustomRecipe', () => {
    it('creates a recipe with correct values based on input parameters', () => {
      const params = {
        coffeeWeight: 20,
        ratio: 16,
        pours: 4,
        bloomMultiplier: 2.5
      };
      
      const recipe = createCustomRecipe(params);
      
      // Check basic recipe properties
      expect(recipe.id).toBe('test-uuid');
      expect(recipe.name).toBe('Custom 20g:320g (1:16)');
      expect(recipe.coffeeWeight).toBe(20);
      expect(recipe.waterWeight).toBe(320);
      expect(recipe.ratio).toBe(16);
      expect(recipe.bloomMultiplier).toBe(2.5);
      expect(recipe.pours).toBe(4);
      
      // Check steps
      expect(recipe.steps.length).toBe(6); // bloom + 4 pours + drawdown
      
      // Check bloom step
      const bloomStep = recipe.steps[0];
      expect(bloomStep.type).toBe('bloom');
      expect(bloomStep.targetTimeInSeconds).toBe(0);
      expect(bloomStep.targetWeight).toBe(50); // 20 * 2.5 = 50
      
      // Check pour calculations (remaining water divided by pours)
      const pourStep = recipe.steps[1];
      expect(pourStep.type).toBe('pour');
      expect(pourStep.targetWeight).toBe(68); // (320 - 50) / 4 = 67.5, rounded to 68
      
      // Check that all pours have the same weight
      const pourWeights = recipe.steps
        .filter(step => step.type === 'pour')
        .map(step => step.targetWeight);
      
      expect(pourWeights).toEqual([68, 68, 68, 68]);
      
      // Check drawdown step
      const drawdownStep = recipe.steps[recipe.steps.length - 1];
      expect(drawdownStep.type).toBe('drawdown');
      expect(drawdownStep.targetWeight).toBe(0);
    });
    
    it('uses default bloomMultiplier when not provided', () => {
      const params = {
        coffeeWeight: 15,
        ratio: 15,
        pours: 3
      };
      
      const recipe = createCustomRecipe(params);
      
      // Should use default bloomMultiplier of 3
      const bloomStep = recipe.steps[0];
      expect(bloomStep.targetWeight).toBe(45); // 15 * 3 = 45
    });
  });
}); 