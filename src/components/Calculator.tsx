'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  GrindSetting, 
  MICRONS_PER_CLICK,
  CLICKS_PER_ROTATION,
  CLICKS_PER_NUMBER,
  BREW_METHODS,
  ZERO_POINT_MICRONS,
  MAX_ADJUSTABLE_MICRONS
} from '@/types/calculator'

export function Calculator() {
  const [targetMicrons, setTargetMicrons] = useState<number>(500)
  const [settings, setSettings] = useState<GrindSetting | null>(null)

  const calculateSettings = () => {
    // Calculate how many microns we need to adjust from zero point
    const adjustmentMicrons = Math.max(0, targetMicrons - ZERO_POINT_MICRONS)
    
    // Calculate total clicks needed for the adjustment
    const totalClicks = Math.round(adjustmentMicrons / MICRONS_PER_CLICK)
    
    // Calculate full rotations
    const rotations = Math.floor(totalClicks / CLICKS_PER_ROTATION)
    
    // Calculate remaining clicks
    const remainingClicks = totalClicks % CLICKS_PER_ROTATION
    
    // Calculate numbers (each number is 3 clicks)
    const numbers = Math.floor(remainingClicks / CLICKS_PER_NUMBER)
    
    // Calculate final clicks (after numbers)
    const clicks = remainingClicks % CLICKS_PER_NUMBER

    setSettings({
      rotations,
      clicks,
      numbers,
      microns: targetMicrons
    })
  }

  const handleBrewMethodSelect = (method: typeof BREW_METHODS[0]) => {
    // Use the middle of the range as the target
    const targetMicrons = Math.round((method.minMicrons + method.maxMicrons) / 2)
    setTargetMicrons(targetMicrons)
    calculateSettings()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>1Zpresso Q2 Grind Calculator</CardTitle>
        <CardDescription>
          Calculate grind settings from zero point (approximately {ZERO_POINT_MICRONS} microns).
          Turn counter-clockwise to adjust coarser.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium">Target Grind Size (microns)</label>
            <Input
              type="number"
              value={targetMicrons}
              onChange={(e) => setTargetMicrons(Number(e.target.value))}
              min={ZERO_POINT_MICRONS}
              max={ZERO_POINT_MICRONS + MAX_ADJUSTABLE_MICRONS}
              className="mt-1"
            />
            {targetMicrons < ZERO_POINT_MICRONS && (
              <p className="text-sm text-red-500 mt-1">
                Cannot go finer than zero point ({ZERO_POINT_MICRONS} microns)
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Select Brew Method</label>
            <div className="grid grid-cols-2 gap-2">
              {BREW_METHODS.map(method => (
                <Button 
                  key={method.name}
                  variant="outline"
                  onClick={() => handleBrewMethodSelect(method)}
                  className="text-sm"
                >
                  {method.name}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={calculateSettings} 
            className="w-full"
            disabled={targetMicrons < ZERO_POINT_MICRONS}
          >
            Calculate
          </Button>

          {settings && (
            <div className="mt-4 space-y-4 border rounded-lg p-4">
              <div>
                <h3 className="font-semibold text-lg">Grind Setting:</h3>
                {settings.microns === ZERO_POINT_MICRONS ? (
                  <p className="text-lg mt-2">At zero point (no adjustment needed)</p>
                ) : (
                  <p className="text-lg mt-2">
                    {settings.rotations} full rotation{settings.rotations !== 1 ? 's' : ''} 
                    {settings.numbers > 0 ? ` + ${settings.numbers} number${settings.numbers !== 1 ? 's' : ''}` : ''}
                    {settings.clicks > 0 ? ` + ${settings.clicks} click${settings.clicks !== 1 ? 's' : ''}` : ''}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  ({settings.microns} microns)
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Suitable For:</h3>
                <ul className="list-disc pl-5 mt-2">
                  {BREW_METHODS.filter(method => 
                    settings.microns >= method.minMicrons && 
                    settings.microns <= method.maxMicrons
                  ).map(method => (
                    <li key={method.name} className="text-sm">
                      {method.name} - {method.description}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 