/**
 * Note: This test requires the following dependencies to be installed:
 * - @testing-library/react
 * - @testing-library/jest-dom
 * 
 * Install with:
 * npm install --save-dev @testing-library/react @testing-library/jest-dom
 * 
 * And setup jest.config.js or jest.setup.js to include:
 * import '@testing-library/jest-dom';
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrewingTimer } from './BrewingTimer';
import { predefinedRecipes } from '@/lib/recipe-utils';
import { useRouter } from 'next/navigation';

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('BrewingTimer', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('should load a recipe by ID from predefined recipes', () => {
    // Get the first predefined recipe for testing
    const testRecipe = predefinedRecipes[0];
    
    render(<BrewingTimer recipeId={testRecipe.id} />);
    
    // Check that the recipe name is displayed
    expect(screen.getByText(testRecipe.name)).toBeInTheDocument();
  });

  it('should redirect to recipe selection if recipe ID is not found', () => {
    render(<BrewingTimer recipeId="non-existent-id" />);
    
    // Check that the router was called to redirect
    expect(mockRouter.push).toHaveBeenCalledWith('/pour-over');
  });
}); 