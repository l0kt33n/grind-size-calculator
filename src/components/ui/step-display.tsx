"use client";

import React from 'react';
import { Step } from '@/types/recipe';
import { Card, CardContent } from './card';

interface StepDisplayProps {
  step: Step;
  currentTimeInSeconds: number;
  totalWaterPoured: number;
  className?: string;
}

export const StepDisplay = ({
  step,
  currentTimeInSeconds,
  totalWaterPoured,
  className = '',
}: StepDisplayProps) => {
  const getStepStatusClass = () => {
    if (currentTimeInSeconds < step.targetTimeInSeconds) {
      return 'text-orange-500'; // Upcoming
    } else if (
      step.type === 'bloom' || 
      step.type === 'pour' || 
      (step.type === 'drawdown' && currentTimeInSeconds < step.targetTimeInSeconds + 60)
    ) {
      return 'text-green-500 font-bold'; // Active
    } else {
      return 'text-gray-500'; // Completed
    }
  };

  const getWaterStatus = () => {
    if (step.type === 'drawdown') {
      return { text: 'Draining...', class: 'text-gray-500' };
    }

    const diff = Math.abs(step.targetWeight - totalWaterPoured);
    if (diff <= 2) {
      return { text: 'Perfect!', class: 'text-green-500 font-bold' };
    } else if (totalWaterPoured < step.targetWeight) {
      return { text: `Add ${step.targetWeight - totalWaterPoured}g more`, class: 'text-orange-500' };
    } else {
      return { text: `${totalWaterPoured - step.targetWeight}g over target`, class: 'text-red-500' };
    }
  };

  const waterStatus = getWaterStatus();

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold text-lg capitalize">{step.type}</div>
          <div className={`${getStepStatusClass()} font-mono`}>
            {step.targetTime}
          </div>
        </div>
        
        <div className="mb-4">
          {step.instruction}
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            Target: <span className="font-bold">{step.targetWeight}g</span>
          </div>
          <div className={waterStatus.class}>
            {waterStatus.text}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 