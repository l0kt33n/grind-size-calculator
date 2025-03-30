"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Recipe, Step, CustomRecipeParams, CustomizationOptions } from '@/types/recipe';
import { predefinedRecipes, createCustomRecipe, formatTime, calculateRecipeWithCustomWater } from '@/lib/recipe-utils';
import { Timer } from './ui/timer';
import { StepDisplay } from './ui/step-display';
import { RecipeForm } from './ui/recipe-form';
import { RecipeCard } from './ui/recipe-card';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { debounce } from 'lodash';

export const V60Brewing = () => {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [originalRecipe, setOriginalRecipe] = useState<Recipe | null>(null);
  const [currentTimeInSeconds, setCurrentTimeInSeconds] = useState<number>(0);
  const [totalWaterPoured, setTotalWaterPoured] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [isCustomFormVisible, setIsCustomFormVisible] = useState<boolean>(false);
  const [isBrewing, setIsBrewing] = useState<boolean>(false);
  const [currentStepWaterTarget, setCurrentStepWaterTarget] = useState<number>(0);
  const [waterForCurrentStep, setWaterForCurrentStep] = useState<number>(0);
  const [nextStepTime, setNextStepTime] = useState<string>('');
  const [customWaterWeight, setCustomWaterWeight] = useState<number>(0);
  const [showWaterAdjust, setShowWaterAdjust] = useState<boolean>(false);

  // Get the current step based on timer
  useEffect(() => {
    if (!selectedRecipe || !isBrewing) return;

    const steps = selectedRecipe.steps;
    let foundCurrentStep = false;
    let currentStepIndex = 0;

    // Find the current step based on time
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStepTime = steps[i].targetTimeInSeconds;
      const nextStepTime = steps[i + 1].targetTimeInSeconds;

      if (currentTimeInSeconds >= currentStepTime && currentTimeInSeconds < nextStepTime) {
        setCurrentStep(steps[i]);
        currentStepIndex = i;
        foundCurrentStep = true;
        // Set the next step time
        setNextStepTime(steps[i + 1].targetTime);
        break;
      }
    }

    // If we're in the last step or beyond
    if (!foundCurrentStep && steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      if (currentTimeInSeconds >= lastStep.targetTimeInSeconds) {
        setCurrentStep(lastStep);
        currentStepIndex = steps.length - 1;
        // For the last step, show expected finish time
        setNextStepTime(formatTime(lastStep.targetTimeInSeconds + 60)); // Typically drawdown ends ~60s after start
      } else {
        setCurrentStep(steps[0]); // Default to first step
        currentStepIndex = 0;
        if (steps.length > 1) {
          setNextStepTime(steps[1].targetTime);
        }
      }
    }

    // Calculate total water poured based on completed steps
    let calculatedWaterPoured = 0;
    let waterInCurrentStep = 0;
    
    // Add water from completed steps (all steps before the current one)
    for (let i = 0; i < currentStepIndex; i++) {
      if (steps[i].type !== 'drawdown') {
        calculatedWaterPoured += steps[i].targetWeight;
      }
    }
    
    // Add water from current step if not drawdown
    if (currentStep && currentStep.type !== 'drawdown') {
      // Set current step target
      setCurrentStepWaterTarget(currentStep.targetWeight);
      
      if (currentTimeInSeconds >= currentStep.targetTimeInSeconds + 10) {
        // If we're more than 10 seconds into the current step, assume all water is poured
        waterInCurrentStep = currentStep.targetWeight;
        calculatedWaterPoured += waterInCurrentStep;
      } else if (currentTimeInSeconds > currentStep.targetTimeInSeconds) {
        // If we're just starting the step, calculate partial water based on time elapsed
        const stepProgress = Math.min(1, (currentTimeInSeconds - currentStep.targetTimeInSeconds) / 10);
        waterInCurrentStep = Math.round(currentStep.targetWeight * stepProgress);
        calculatedWaterPoured += waterInCurrentStep;
      }
      
      setWaterForCurrentStep(waterInCurrentStep);
    } else {
      // For drawdown step, show the total water as target
      setCurrentStepWaterTarget(0);
      setWaterForCurrentStep(0);
    }
    
    setTotalWaterPoured(calculatedWaterPoured);
  }, [currentTimeInSeconds, selectedRecipe, isBrewing, currentStep]);

  // Handle timer updates
  const handleTimeUpdate = (timeInSeconds: number) => {
    setCurrentTimeInSeconds(timeInSeconds);
  };

  // Handle recipe selection
  const handleRecipeSelect = (recipe: Recipe) => {
    setOriginalRecipe(recipe);
    setSelectedRecipe(recipe);
    setCurrentTimeInSeconds(0);
    setTotalWaterPoured(0);
    setCurrentStepWaterTarget(recipe.steps[0].targetWeight);
    setWaterForCurrentStep(0);
    setCustomWaterWeight(recipe.waterWeight);
    setShowWaterAdjust(true);
  };

  // Handle custom recipe creation
  const handleCreateCustomRecipe = (params: CustomRecipeParams) => {
    const newRecipe = createCustomRecipe(params);
    setOriginalRecipe(newRecipe);
    setSelectedRecipe(newRecipe);
    setIsCustomFormVisible(false);
    setCurrentTimeInSeconds(0);
    setTotalWaterPoured(0);
    setCurrentStepWaterTarget(newRecipe.steps[0].targetWeight);
    setWaterForCurrentStep(0);
    setCustomWaterWeight(newRecipe.waterWeight);
    setShowWaterAdjust(true);
  };

  // Create debounced version of applyCustomWater
  const debouncedApplyCustomWater = useCallback(
    debounce((weight: number) => {
      if (weight >= 100 && selectedRecipe) {
        const customizedRecipe = calculateRecipeWithCustomWater(selectedRecipe, {
          waterWeight: weight
        });
        setSelectedRecipe(customizedRecipe);
      }
    }, 500),
    [selectedRecipe]
  );

  // Handle water weight input change with debounce
  const handleCustomWaterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCustomWaterWeight(isNaN(value) ? 0 : value);
    if (!isNaN(value) && value >= 100) {
      debouncedApplyCustomWater(value);
    }
  };

  // Start brewing with the selected recipe
  const startBrewing = () => {
    if (!selectedRecipe) return;
    
    setIsBrewing(true);
    setCurrentStep(selectedRecipe.steps[0]);
    setShowWaterAdjust(false);
    
    if (selectedRecipe.steps.length > 1) {
      setNextStepTime(selectedRecipe.steps[1].targetTime);
    }
  };

  // Reset brewing state
  const handleReset = () => {
    setSelectedRecipe(null);
    setOriginalRecipe(null);
    setCurrentTimeInSeconds(0);
    setTotalWaterPoured(0);
    setCurrentStepWaterTarget(0);
    setWaterForCurrentStep(0);
    setNextStepTime('');
    setIsBrewing(false);
    setCurrentStep(null);
    setShowWaterAdjust(false);
  };

  // Get water status display values
  const getWaterStatus = () => {
    if (!currentStep) return { currentAmount: 0, targetAmount: 0, progressPercent: 0 };
    
    if (currentStep.type === 'drawdown') {
      // For drawdown step, show total water and recipe total
      return {
        currentAmount: totalWaterPoured,
        targetAmount: selectedRecipe?.waterWeight || 0,
        progressPercent: Math.round((totalWaterPoured / (selectedRecipe?.waterWeight || 1)) * 100)
      };
    } else {
      // For active steps, show current step water and target
      return {
        currentAmount: waterForCurrentStep,
        targetAmount: currentStepWaterTarget,
        progressPercent: Math.round((waterForCurrentStep / (currentStepWaterTarget || 1)) * 100)
      };
    }
  };

  const waterStatus = getWaterStatus();

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">V60 Pour-Over Timer</h2>
        <p className="text-gray-600 mb-6">Select a recipe or create your own to start brewing</p>
      </div>

      {!selectedRecipe && !isCustomFormVisible && (
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
      )}

      {isCustomFormVisible && !selectedRecipe && (
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

      {selectedRecipe && showWaterAdjust && (
        <div className="max-w-md mx-auto w-full">
          <Card>
            <CardHeader>
              <CardTitle>{selectedRecipe.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-2">
              <Label htmlFor="waterWeight">Total Water Weight: </Label>
                    <Input
                      id="waterWeight"
                      type="number"
                      value={customWaterWeight}
                      onChange={handleCustomWaterChange}
                      min={100}
                      className="w-24"
                    />               
                    <span>g</span>   
                </div>
                
                <div className="pt-4">
                  <div className="text-sm text-gray-500 mb-2">Recipe Summary</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Coffee: <span className="font-bold">{selectedRecipe.coffeeWeight}g</span></div>
                    <div>Water: <span className="font-bold">{selectedRecipe.waterWeight}g</span></div>
                    <div>Ratio: <span className="font-bold">1:{selectedRecipe.ratio}</span></div>
                    <div>Pours: <span className="font-bold">{selectedRecipe.pours}</span></div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-500 mb-2">Step Breakdown</div>
                    <div className="space-y-1 text-sm">
                      {selectedRecipe.steps.map((step, index) => (
                        step.type !== 'drawdown' && (
                          <div key={step.id} className="flex justify-between">
                            <span className="capitalize">{step.type} {index > 0 ? index : ''}</span>
                            <span className="font-medium">{step.targetWeight}g</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                Back
              </Button>
              <Button onClick={startBrewing}>
                Start Brewing
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {selectedRecipe && isBrewing && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedRecipe.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <div className="mb-6">
                    <Timer 
                      initialTimeInSeconds={0} 
                      targetTime={nextStepTime}
                      onTimeUpdate={handleTimeUpdate}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-center font-medium">
                      <div className="flex justify-between items-center px-2 py-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <div>
                          <span className="text-sm text-gray-500">Current Pour</span>
                          <div className="text-xl font-bold">{waterStatus.currentAmount}g</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Step Target</span>
                          <div className="text-xl font-bold">{waterStatus.targetAmount}g</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Total Water</span>
                          <div className="text-xl font-bold">{totalWaterPoured}g / {selectedRecipe.waterWeight}g</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  {currentStep && (
                    <StepDisplay
                      step={currentStep}
                      currentTimeInSeconds={currentTimeInSeconds}
                      totalWaterPoured={totalWaterPoured}
                      className="mb-4"
                    />
                  )}
                  
                  <div className="text-sm space-y-2 mt-4">
                    <div className="font-medium">Upcoming Steps:</div>
                    <div className="space-y-1">
                      {selectedRecipe.steps
                        .filter(step => step.targetTimeInSeconds > currentTimeInSeconds)
                        .slice(0, 2)
                        .map(step => (
                          <div key={step.id} className="flex justify-between text-gray-600">
                            <span className="capitalize">{step.type} ({step.targetWeight}g)</span>
                            <span>{step.targetTime}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="w-full max-w-md"
            >
              Exit Brewing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}; 