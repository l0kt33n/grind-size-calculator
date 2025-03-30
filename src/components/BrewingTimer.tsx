"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Recipe, Step } from '@/types/recipe';
import { formatTime, calculateRecipeWithCustomWater } from '@/lib/recipe-utils';
import { Timer } from './ui/timer';
import { StepDisplay } from './ui/step-display';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { debounce } from 'lodash';

export const BrewingTimer = () => {
  const router = useRouter();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [originalRecipe, setOriginalRecipe] = useState<Recipe | null>(null);
  const [currentTimeInSeconds, setCurrentTimeInSeconds] = useState<number>(0);
  const [totalWaterPoured, setTotalWaterPoured] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [currentStepWaterTarget, setCurrentStepWaterTarget] = useState<number>(0);
  const [waterForCurrentStep, setWaterForCurrentStep] = useState<number>(0);
  const [nextStepTime, setNextStepTime] = useState<string>('');
  const [customWaterWeight, setCustomWaterWeight] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load the recipe from localStorage on component mount
  useEffect(() => {
    const storedRecipe = localStorage.getItem('selectedRecipe');
    
    if (storedRecipe) {
      try {
        const recipe = JSON.parse(storedRecipe) as Recipe;
        setOriginalRecipe(recipe);
        setSelectedRecipe(recipe);
        setCurrentTimeInSeconds(0);
        setTotalWaterPoured(0);
        setCurrentStepWaterTarget(recipe.steps[0].targetWeight);
        setWaterForCurrentStep(0);
        setCustomWaterWeight(recipe.waterWeight);
        setCurrentStep(recipe.steps[0]);
        
        if (recipe.steps.length > 1) {
          setNextStepTime(recipe.steps[1].targetTime);
        }
      } catch (error) {
        console.error('Failed to parse stored recipe:', error);
        router.push('/pour-over');
      }
    } else {
      // Redirect to recipe selection if no recipe found
      router.push('/pour-over');
    }
    
    setIsLoading(false);
  }, [router]);

  // Get the current step based on timer
  useEffect(() => {
    if (!selectedRecipe) return;

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
  }, [currentTimeInSeconds, selectedRecipe, currentStep]);

  // Handle timer updates
  const handleTimeUpdate = (timeInSeconds: number) => {
    setCurrentTimeInSeconds(timeInSeconds);
    if (timeInSeconds > 0) {
      setIsTimerActive(true);
    } else {
      setIsTimerActive(false);
    }
  };

  // Create debounced version of applyCustomWater
  const debouncedApplyCustomWater = 
    debounce((weight: number) => {
      if (weight >= 100 && originalRecipe) {
        const customizedRecipe = calculateRecipeWithCustomWater(originalRecipe, {
          waterWeight: weight
        });
        setSelectedRecipe(customizedRecipe);
      }
    }, 500);

  // Handle water weight input change with debounce
  const handleCustomWaterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCustomWaterWeight(isNaN(value) ? 0 : value);
    if (!isNaN(value) && value >= 100) {
      debouncedApplyCustomWater(value);
    }
  };

  // Reset brewing state and go back to recipe selection
  const handleReset = () => {
    localStorage.removeItem('selectedRecipe');
    router.push('/pour-over');
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

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {selectedRecipe && (
        <>
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
                    {!isTimerActive && (
                      <div className="flex items-center space-x-2 mb-2">
                        <Label htmlFor="waterWeightBrewing">Total Water Weight: </Label>
                        <Input
                          id="waterWeightBrewing"
                          type="number"
                          value={customWaterWeight}
                          onChange={handleCustomWaterChange}
                          min={100}
                          className="w-24"
                        />               
                        <span>g</span>   
                      </div>
                    )}
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
        </>
      )}
    </div>
  );
}; 