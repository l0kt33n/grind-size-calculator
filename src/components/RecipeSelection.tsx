"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Recipe, CustomRecipeParams } from '@/types/recipe';
import { predefinedRecipes, createCustomRecipe } from '@/lib/recipe-utils';
import { RecipeForm } from './ui/recipe-form';
import { RecipeCard } from './ui/recipe-card';
import { Button } from './ui/button';

export const RecipeSelection = () => {
  const router = useRouter();
  const [isCustomFormVisible, setIsCustomFormVisible] = useState<boolean>(false);

  const handleRecipeSelect = (recipe: Recipe) => {
    // Store recipe in localStorage and navigate to brewing page
    localStorage.setItem('selectedRecipe', JSON.stringify(recipe));
    router.push('/pour-over/brew');
  };

  const handleCreateCustomRecipe = (params: CustomRecipeParams) => {
    const newRecipe = createCustomRecipe(params);
    // Store recipe in localStorage and navigate to brewing page
    localStorage.setItem('selectedRecipe', JSON.stringify(newRecipe));
    router.push('/pour-over/brew');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Pour-Over Coffee Timer</h2>
        <p className="text-gray-600 mb-6">Select a recipe or create your own to start brewing</p>
      </div>

      {!isCustomFormVisible ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predefinedRecipes.map((recipe) => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onSelect={handleRecipeSelect} 
              />
            ))}
          </div>
          
          <div className="flex justify-center mt-6">
            <Button 
              className="w-full max-w-md" 
              onClick={() => setIsCustomFormVisible(true)}
            >
              Create Custom Recipe
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto w-full">
          <RecipeForm 
            onCreateRecipe={handleCreateCustomRecipe} 
            className="mb-4"
          />
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setIsCustomFormVisible(false)}
          >
            Back to Recipes
          </Button>
        </div>
      )}
    </div>
  );
}; 