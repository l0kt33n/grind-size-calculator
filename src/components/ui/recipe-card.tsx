"use client";

import React from 'react';
import { Recipe } from '@/types/recipe';
import { formatTime } from '@/lib/recipe-utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  className?: string;
}

export const RecipeCard = ({
  recipe,
  onSelect,
  className = '',
}: RecipeCardProps) => {
  const handleSelect = () => {
    onSelect(recipe);
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{recipe.name}</CardTitle>
        {recipe.source && (
          <div className="text-xs text-gray-500">Source: {recipe.source}</div>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>Coffee: <span className="font-medium">{recipe.coffeeWeight}g</span></div>
          <div>Water: <span className="font-medium">{recipe.waterWeight}g</span></div>
          <div>Ratio: <span className="font-medium">1:{recipe.ratio}</span></div>
          <div>Pours: <span className="font-medium">{recipe.pours}</span></div>
          <div>Bloom: <span className="font-medium">{Math.round(recipe.coffeeWeight * recipe.bloomMultiplier)}g</span></div>
          <div>Duration: <span className="font-medium">{formatTime(recipe.totalBrewTime)}</span></div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleSelect}>Start Brewing</Button>
      </CardFooter>
    </Card>
  );
}; 