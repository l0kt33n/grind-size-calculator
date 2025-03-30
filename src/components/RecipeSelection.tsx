"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Recipe } from '@/types/recipe';
import { predefinedRecipes } from '@/lib/recipe-utils';
import { RecipeCard } from './ui/recipe-card';
import { Button } from './ui/button';

export const RecipeSelection = () => {
  const router = useRouter();
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);

  // Load custom recipes from localStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRecipes = localStorage.getItem('customRecipes');
      if (savedRecipes) {
        setCustomRecipes(JSON.parse(savedRecipes));
      }
    }
  }, []);

  const handleRecipeSelect = (recipe: Recipe) => {
    // Navigate to brewing page with recipeId as URL parameter
    router.push(`/pour-over/brew/${recipe.id}`);
  };

  const handleCreateCustomRecipe = () => {
    // Navigate to the new custom recipe creation page
    router.push('/pour-over/custom');
  };

  const handleManageCustomRecipes = () => {
    router.push('/pour-over/custom/manage');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Pour-Over Coffee Timer</h2>
        <p className="text-gray-600 mb-6">Select a recipe or create your own to start brewing</p>
      </div>

      <div className="space-y-8">
        {/* Predefined Recipes */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Standard Recipes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predefinedRecipes.map((recipe) => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onSelect={handleRecipeSelect} 
              />
            ))}
          </div>
        </div>
        
        {/* Custom Recipes */}
        {customRecipes.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Your Custom Recipes</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleManageCustomRecipes}
              >
                Manage Recipes
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customRecipes.map((recipe) => (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  onSelect={handleRecipeSelect} 
                />
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-center mt-6">
          <Button 
            className="w-full max-w-md" 
            onClick={handleCreateCustomRecipe}
          >
            Create Custom Recipe
          </Button>
        </div>
      </div>
    </div>
  );
}; 