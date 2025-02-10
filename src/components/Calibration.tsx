'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { CalibrationPoint, CalibrationData, CALIBRATION_POINTS, GrinderModel } from '@/types/calculator'

interface CalibrationProps {
  selectedModel: GrinderModel;
  onCalibrationUpdate: (calibration: CalibrationData) => void;
}

export function Calibration({ selectedModel, onCalibrationUpdate }: CalibrationProps) {
  const [isWizardMode, setIsWizardMode] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [calibrationData, setCalibrationData] = useState<CalibrationData>({
    modelId: selectedModel.id,
    points: [],
    lastUpdated: Date.now()
  })

  // Load saved calibration data only when model changes
  useEffect(() => {
    const savedData = localStorage.getItem(`calibration-${selectedModel.id}`)
    if (savedData) {
      const parsed = JSON.parse(savedData)
      setCalibrationData(parsed)
      onCalibrationUpdate(parsed)
    } else {
      const initial = {
        modelId: selectedModel.id,
        points: [],
        lastUpdated: Date.now()
      }
      setCalibrationData(initial)
      onCalibrationUpdate(initial)
    }
  }, [selectedModel.id])

  const addCalibrationPoint = (point: CalibrationPoint) => {
    const newData = {
      ...calibrationData,
      points: [...calibrationData.points.filter(p => 
        p.rotations !== point.rotations || 
        p.numbers !== point.numbers || 
        p.clicks !== point.clicks
      ), point],
      lastUpdated: Date.now()
    }
    setCalibrationData(newData)
    localStorage.setItem(`calibration-${selectedModel.id}`, JSON.stringify(newData))
    onCalibrationUpdate(newData)
  }

  const removeCalibrationPoint = (point: CalibrationPoint) => {
    const newData = {
      ...calibrationData,
      points: calibrationData.points.filter(p => 
        p.rotations !== point.rotations || 
        p.numbers !== point.numbers || 
        p.clicks !== point.clicks
      ),
      lastUpdated: Date.now()
    }
    setCalibrationData(newData)
    localStorage.setItem(`calibration-${selectedModel.id}`, JSON.stringify(newData))
    onCalibrationUpdate(newData)
  }

  const ManualEntry = () => {
    const [rotations, setRotations] = useState('0')
    const [numbers, setNumbers] = useState('0')
    const [clicks, setClicks] = useState('0')
    const [microns, setMicrons] = useState('')

    const handleSubmit = () => {
      const point: CalibrationPoint = {
        rotations: Number(rotations),
        numbers: Number(numbers),
        clicks: Number(clicks),
        measuredMicrons: Number(microns),
        timestamp: Date.now()
      }
      addCalibrationPoint(point)
      setRotations('0')
      setNumbers('0')
      setClicks('0')
      setMicrons('')
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label>Rotations</Label>
            <Input 
              type="number" 
              value={rotations}
              onChange={e => setRotations(e.target.value)}
              min="0"
            />
          </div>
          <div>
            <Label>Numbers</Label>
            <Input 
              type="number" 
              value={numbers}
              onChange={e => setNumbers(e.target.value)}
              min="0"
              max={selectedModel.numbersPerRotation - 1}
            />
          </div>
          <div>
            <Label>Clicks</Label>
            <Input 
              type="number" 
              value={clicks}
              onChange={e => setClicks(e.target.value)}
              min="0"
              max={selectedModel.clicksPerNumber - 1}
            />
          </div>
          <div>
            <Label>Microns</Label>
            <Input 
              type="number" 
              value={microns}
              onChange={e => setMicrons(e.target.value)}
              min={selectedModel.zeroPointMicrons}
            />
          </div>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={!microns || Number(microns) < selectedModel.zeroPointMicrons}
          className="w-full"
        >
          Add Calibration Point
        </Button>
      </div>
    )
  }

  const CalibrationWizard = () => {
    const [microns, setMicrons] = useState('')
    const currentPoint = CALIBRATION_POINTS[currentStep]

    const handleNext = () => {
      const point: CalibrationPoint = {
        rotations: currentPoint.targetRotations,
        numbers: currentPoint.targetNumbers,
        clicks: currentPoint.targetClicks,
        measuredMicrons: Number(microns),
        timestamp: Date.now()
      }
      addCalibrationPoint(point)
      setMicrons('')
      
      if (currentStep < CALIBRATION_POINTS.length - 1) {
        setCurrentStep(prev => prev + 1)
      } else {
        setIsWizardMode(false)
        setCurrentStep(0)
      }
    }

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="font-semibold text-lg">{currentPoint.name}</h3>
          <p className="text-sm text-gray-600">{currentPoint.description}</p>
          <p className="mt-2">
            Set to: {currentPoint.targetRotations} rotations, 
            {currentPoint.targetNumbers} numbers, 
            {currentPoint.targetClicks} clicks
          </p>
        </div>
        <div>
          <Label>Measured Microns</Label>
          <Input 
            type="number" 
            value={microns}
            onChange={e => setMicrons(e.target.value)}
            min={selectedModel.zeroPointMicrons}
            className="mt-1"
          />
        </div>
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => {
              setCurrentStep(prev => Math.max(0, prev - 1))
              setMicrons('')
            }}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!microns || Number(microns) < selectedModel.zeroPointMicrons}
          >
            {currentStep === CALIBRATION_POINTS.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Calibration</h2>
        <Button
          variant="outline"
          onClick={() => {
            setIsWizardMode(!isWizardMode)
            setCurrentStep(0)
          }}
        >
          {isWizardMode ? 'Switch to Manual' : 'Start Wizard'}
        </Button>
      </div>

      {isWizardMode ? <CalibrationWizard /> : <ManualEntry />}

      {calibrationData.points.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Calibration Points</h3>
          <div className="space-y-2">
            {calibrationData.points.map((point, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span>
                  {point.rotations}r {point.numbers}n {point.clicks}c = {point.measuredMicrons}μm
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCalibrationPoint(point)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
} 