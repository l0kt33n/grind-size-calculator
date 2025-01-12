'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { ChevronDown } from "lucide-react"
import { 
  GrindSetting,
  GrinderModel,
  GRINDER_MODELS,
  DEFAULT_MODEL,
  BREW_METHODS,
  MAX_ADJUSTABLE_MICRONS
} from '@/types/calculator'

export function Calculator() {
  const [targetMicrons, setTargetMicrons] = useState<number>(500)
  const [targetMicronsInput, setTargetMicronsInput] = useState<string>('500')
  const [settings, setSettings] = useState<GrindSetting | null>(null)
  const [selectedModel, setSelectedModel] = useState<GrinderModel>(DEFAULT_MODEL)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customSettings, setCustomSettings] = useState({
    numbersPerRotation: DEFAULT_MODEL.numbersPerRotation,
    clicksPerRotation: DEFAULT_MODEL.clicksPerRotation,
    clicksPerNumber: DEFAULT_MODEL.clicksPerNumber,
    mmPerClick: DEFAULT_MODEL.mmPerClick,
    zeroPointMicrons: DEFAULT_MODEL.zeroPointMicrons
  })

  const calculateSettings = () => {
    // Use either custom settings or model defaults
    const settings = showAdvanced ? customSettings : selectedModel
    
    // Convert mm to microns and calculate adjustment
    const micronsPerClick = settings.mmPerClick * 1000
    const adjustmentMicrons = Math.max(0, targetMicrons - settings.zeroPointMicrons)
    
    // Calculate total clicks needed for the adjustment
    const totalClicks = Math.round(adjustmentMicrons / micronsPerClick)
    
    // Calculate full rotations
    const rotations = Math.floor(totalClicks / settings.clicksPerRotation)
    
    // Calculate remaining clicks
    const remainingClicks = totalClicks % settings.clicksPerRotation
    
    // Calculate numbers (using clicks per number)
    const numbers = Math.floor(remainingClicks / settings.clicksPerNumber)
    
    // Calculate final clicks
    const clicks = remainingClicks % settings.clicksPerNumber

    setSettings({
      rotations,
      clicks,
      numbers,
      microns: targetMicrons
    })
  }

  const handleModelChange = (modelId: string) => {
    const model = GRINDER_MODELS.find(m => m.id === modelId) || DEFAULT_MODEL
    setSelectedModel(model)
    // Update custom settings to match the new model
    setCustomSettings({
      numbersPerRotation: model.numbersPerRotation,
      clicksPerRotation: model.clicksPerRotation,
      clicksPerNumber: model.clicksPerNumber,
      mmPerClick: model.mmPerClick,
      zeroPointMicrons: model.zeroPointMicrons
    })
  }

  const handleBrewMethodSelect = (method: typeof BREW_METHODS[0]) => {
    const targetMicrons = Math.round((method.minMicrons + method.maxMicrons) / 2)
    setTargetMicrons(targetMicrons)
    setTargetMicronsInput(targetMicrons.toString())
    calculateSettings()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>1Zpresso Grind Calculator</CardTitle>
        <CardDescription>
          Calculate grind settings from zero point (approximately {selectedModel.zeroPointMicrons} microns).
          Turn counter-clockwise to adjust coarser.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Grinder Model</Label>
            <Select value={selectedModel.id} onValueChange={handleModelChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select grinder model" />
              </SelectTrigger>
              <SelectContent>
                {GRINDER_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} ({model.adjustmentType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Grind Size (microns)</Label>
            <Input
              type="number"
              value={targetMicronsInput}
              onChange={(e) => setTargetMicronsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setTargetMicrons(Number(targetMicronsInput))
                  calculateSettings()
                }
              }}
              min={selectedModel.zeroPointMicrons}
              max={selectedModel.zeroPointMicrons + MAX_ADJUSTABLE_MICRONS}
              className="mt-1"
            />
            {targetMicrons < selectedModel.zeroPointMicrons && (
              <p className="text-sm text-red-500 mt-1">
                Cannot go finer than zero point ({selectedModel.zeroPointMicrons} microns)
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Quick Select Brew Method</Label>
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

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full flex items-center justify-between">
                Advanced Settings
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'transform rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div>
                  <Label>Numbers per Rotation</Label>
                  <Input
                    type="number"
                    value={customSettings.numbersPerRotation}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, numbersPerRotation: Number(e.target.value) }))}
                    min={1}
                    step={1}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Clicks per Rotation</Label>
                  <Input
                    type="number"
                    value={customSettings.clicksPerRotation}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, clicksPerRotation: Number(e.target.value) }))}
                    min={1}
                    step={1}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Clicks per Number</Label>
                  <Input
                    type="number"
                    value={customSettings.clicksPerNumber}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, clicksPerNumber: Number(e.target.value) }))}
                    min={1}
                    step={1}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>MM per Click</Label>
                  <Input
                    type="number"
                    value={customSettings.mmPerClick}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, mmPerClick: Number(e.target.value) }))}
                    min={0.001}
                    step={0.001}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Grinder at Zero Point in Microns</Label>
                  <Input
                    type="number"
                    value={customSettings.zeroPointMicrons}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, zeroPointMicrons: Number(e.target.value) }))}
                    min={100}
                    step={1}
                    className="mt-1"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button 
            onClick={calculateSettings} 
            className="w-full"
            disabled={targetMicrons < selectedModel.zeroPointMicrons}
          >
            Calculate
          </Button>

          {settings && (
            <div className="mt-4 space-y-4 border rounded-lg p-4">
              <div>
                <h3 className="font-semibold text-lg">Grind Setting:</h3>
                {settings.microns === selectedModel.zeroPointMicrons ? (
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