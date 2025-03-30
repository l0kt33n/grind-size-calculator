"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './button';

interface TimerProps {
  initialTimeInSeconds?: number;
  targetTime?: string;
  onTimeUpdate?: (currentTimeInSeconds: number) => void;
  className?: string;
}

export const Timer = ({
  initialTimeInSeconds = 0,
  targetTime,
  onTimeUpdate,
  className = '',
}: TimerProps) => {
  const [timeInSeconds, setTimeInSeconds] = useState(initialTimeInSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevTimeRef = useRef<number>(timeInSeconds);

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer controls
  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeInSeconds(initialTimeInSeconds);
  };

  // Notify parent of time updates when time changes
  useEffect(() => {
    // Only notify if time has actually changed
    if (timeInSeconds !== prevTimeRef.current && onTimeUpdate) {
      prevTimeRef.current = timeInSeconds;
      // Use setTimeout to avoid updating during render
      const timeoutId = setTimeout(() => {
        onTimeUpdate(timeInSeconds);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [timeInSeconds, onTimeUpdate]);

  // Update timer every second when running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeInSeconds(prevTime => prevTime + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="font-geist-mono text-4xl font-bold my-4 flex items-center justify-center">
        <span>{formatTime(timeInSeconds)}</span>
        {targetTime && (
          <>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-500">{targetTime}</span>
          </>
        )}
      </div>
      <div className="flex gap-2">
        {!isRunning ? (
          <Button onClick={startTimer} disabled={isRunning}>
            {timeInSeconds === 0 ? 'Start' : 'Resume'}
          </Button>
        ) : (
          <Button onClick={pauseTimer} disabled={!isRunning}>
            Pause
          </Button>
        )}
        <Button 
          onClick={resetTimer} 
          variant="outline" 
          disabled={timeInSeconds === 0 && !isRunning}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}; 