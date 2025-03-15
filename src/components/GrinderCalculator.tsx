'use client'

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { queryMicrons, formatSetting } from '@/lib/coffee-utils';
import { QueryResult, Grinder } from '@/types/coffee';

export function GrinderCalculator() {
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  const [selectedGrinder, setSelectedGrinder] = useState<string>('');
  const [microns, setMicrons] = useState<number>(500);
  const [brewMethod, setBrewMethod] = useState<string>('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load grinders on component mount
  useEffect(() => {
    const loadGrinders = async () => {
      try {
        const response = await fetch('/grinderData.json');
        const data = await response.json();
        setGrinders(data.grinders);
        
        // Set default selected grinder if available
        if (data.grinders.length > 0) {
          setSelectedGrinder(data.grinders[0].name);
        }
      } catch (err) {
        console.error('Failed to load grinders:', err);
        setError('Failed to load grinder data');
      }
    };

    loadGrinders();
  }, []);

  const handleQuery = async () => {
    if (!selectedGrinder) {
      setError('Please select a grinder');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const queryResult = await queryMicrons({
        grinderName: selectedGrinder,
        targetMicrons: microns,
        brewMethod: brewMethod || undefined
      });
      
      setResult(queryResult);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Coffee Grinder Calculator</CardTitle>
          <CardDescription>
            Find the optimal grinder setting for your brew method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="grinder">Grinder</Label>
              <Select 
                value={selectedGrinder} 
                onValueChange={setSelectedGrinder}
              >
                <SelectTrigger id="grinder">
                  <SelectValue placeholder="Select a grinder" />
                </SelectTrigger>
                <SelectContent>
                  {grinders.map((grinder) => (
                    <SelectItem key={grinder.id} value={grinder.name}>
                      {grinder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="microns">Target Microns: {microns}</Label>
              <Slider
                id="microns"
                min={200}
                max={1400}
                step={10}
                value={[microns]}
                onValueChange={(values: number[]) => setMicrons(values[0])}
                className="my-2"
              />
              <div className="flex items-center text-xs text-muted-foreground">
                <span>Fine</span>
                <div className="grow"></div>
                <span>Coarse</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="brew-method">Brew Method (Optional)</Label>
              <Input
                id="brew-method"
                placeholder="e.g. Espresso, Pour Over, Aeropress"
                value={brewMethod}
                onChange={(e) => setBrewMethod(e.target.value)}
              />
            </div>

            <Button onClick={handleQuery} disabled={loading || !selectedGrinder}>
              {loading ? 'Calculating...' : 'Calculate Setting'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200">
          <CardContent className="pt-6 text-red-500">
            {error}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{result.grinder.name}</CardTitle>
            <CardDescription>
              Target: {result.target_microns} microns ({result.grind_category})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Recommended Setting</h3>
                <p className="text-xl">
                  {formatSetting(result.calculated_setting, result.setting_format)}
                </p>
              </div>

              {result.matching_methods.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Recommended Brew Methods</h3>
                  <ul className="space-y-2">
                    {result.matching_methods.map((method, idx) => (
                      <li key={idx} className="border-b pb-2 last:border-0">
                        <div className="font-medium">
                          {idx === 0 ? '★ Ideal: ' : '☆ Alternative: '}
                          {method.method_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Range: {method.start_microns} - {method.end_microns} microns 
                          ({method.grind_category})
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.grinder.url && (
                <div className="mt-2">
                  <a 
                    href={result.grinder.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View detailed grind chart →
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 