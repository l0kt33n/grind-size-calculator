"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { CustomRecipeParams } from '@/types/recipe';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface RecipeFormProps {
  onCreateRecipe: (params: CustomRecipeParams) => void;
  className?: string;
}

export const RecipeForm = ({
  onCreateRecipe,
  className = '',
}: RecipeFormProps) => {
  const [coffeeWeight, setCoffeeWeight] = useState<string>('20');
  const [ratio, setRatio] = useState<string>('16');
  const [pours, setPours] = useState<string>('4');
  const [bloomMultiplier, setBloomMultiplier] = useState<string>('3');
  const [waterWeight, setWaterWeight] = useState<string>('320');

  // Calculate water weight when coffee weight or ratio changes
  useEffect(() => {
    const coffeeNum = parseFloat(coffeeWeight) || 0;
    const ratioNum = parseFloat(ratio) || 0;
    
    if (coffeeNum > 0 && ratioNum > 0) {
      setWaterWeight((coffeeNum * ratioNum).toFixed(0));
    }
  }, [coffeeWeight, ratio]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params: CustomRecipeParams = {
      coffeeWeight: parseFloat(coffeeWeight) || 20,
      ratio: parseFloat(ratio) || 16,
      pours: parseInt(pours) || 4,
      bloomMultiplier: parseFloat(bloomMultiplier) || 3,
    };
    
    onCreateRecipe(params);
  };

  const isValidForm = () => {
    return (
      parseFloat(coffeeWeight) > 0 &&
      parseFloat(ratio) > 0 &&
      parseInt(pours) > 0 &&
      parseFloat(bloomMultiplier) > 0
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Create Custom Recipe</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coffeeWeight">Coffee Weight (g)</Label>
              <Input
                id="coffeeWeight"
                type="number"
                value={coffeeWeight}
                onChange={(e) => setCoffeeWeight(e.target.value)}
                min="1"
                step="1"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ratio">Water-to-Coffee Ratio</Label>
              <Input
                id="ratio"
                type="number"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                min="1"
                step="0.1"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pours">Number of Pours</Label>
              <Input
                id="pours"
                type="number"
                value={pours}
                onChange={(e) => setPours(e.target.value)}
                min="1"
                max="10"
                step="1"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bloomMultiplier">Bloom Multiplier</Label>
              <Input
                id="bloomMultiplier"
                type="number"
                value={bloomMultiplier}
                onChange={(e) => setBloomMultiplier(e.target.value)}
                min="1"
                max="5"
                step="0.1"
                required
              />
            </div>
          </div>
          
          <div className="pt-2">
            <div className="text-sm text-gray-500 mb-2">Recipe Summary</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Coffee: <span className="font-bold">{coffeeWeight}g</span></div>
              <div>Water: <span className="font-bold">{waterWeight}g</span></div>
              <div>Ratio: <span className="font-bold">1:{ratio}</span></div>
              <div>Pours: <span className="font-bold">{pours}</span></div>
              <div>Bloom Water: <span className="font-bold">{Math.round(parseFloat(coffeeWeight) * parseFloat(bloomMultiplier))}g</span></div>
              <div>Water per Pour: <span className="font-bold">
                {Math.round((parseFloat(waterWeight) - (parseFloat(coffeeWeight) * parseFloat(bloomMultiplier))) / parseInt(pours))}g
              </span></div>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full mt-4" 
            disabled={!isValidForm()}
          >
            Create Recipe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}; 