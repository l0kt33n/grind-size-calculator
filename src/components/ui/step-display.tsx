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

    return { text: `Target: ${step.targetWeight}g`, class: 'text-blue-500' };
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
          <div className={waterStatus.class}>
            {waterStatus.text}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 