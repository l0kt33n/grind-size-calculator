'use client'

import { useEffect, useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { queryMicrons, formatSetting } from '@/lib/coffee-utils';
import { QueryResult, Grinder } from '@/types/coffee';
import Fuse, { FuseResult } from 'fuse.js';

const BREW_METHODS = [
  'Turkish',
  'Espresso',
  'V60',
  'Aeropress',
  'Moka Pot',
  'Pour Over',
  'Siphon',
  'Filter Coffee Machine',
  'French Press',
  'Cupping',
  'Cold Brew',
  'Cold Drip',
  'Steep-and-release'
];

export function GrinderCalculator() {
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  const [selectedGrinder, setSelectedGrinder] = useState<string>('');
  const [microns, setMicrons] = useState<number>(500);
  const [brewMethod, setBrewMethod] = useState<string>('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load grinders on component mount
  useEffect(() => {
    const loadGrinders = async () => {
      try {
        const response = await fetch('/grinderData.json');
        const data = await response.json();
        setGrinders(data.grinders);
        
        // Load selected grinder from localStorage or set default
        const savedGrinder = localStorage.getItem('selectedGrinder');
        if (savedGrinder && data.grinders.some((g: Grinder) => g.name === savedGrinder)) {
          setSelectedGrinder(savedGrinder);
        } else if (data.grinders.length > 0) {
          setSelectedGrinder(data.grinders[0].name);
        }
      } catch (err) {
        console.error('Failed to load grinders:', err);
        setError('Failed to load grinder data');
      }
    };

    loadGrinders();
  }, []);

  // Fuzzy search for grinders
  const fuse = useMemo(() => {
    return new Fuse(grinders, {
      keys: ['name', 'brand'],
      threshold: 0.3,
      includeScore: true
    });
  }, [grinders]);

  const filteredGrinders = useMemo(() => {
    if (!searchQuery) return grinders;
    return fuse.search(searchQuery).map((result: FuseResult<Grinder>) => result.item);
  }, [fuse, searchQuery, grinders]);

  // Auto-calculate when inputs change
  useEffect(() => {
    if (selectedGrinder) {
      handleQuery();
    }
  }, [selectedGrinder, microns, brewMethod]);

  // Save selected grinder to localStorage when it changes
  useEffect(() => {
    if (selectedGrinder) {
      localStorage.setItem('selectedGrinder', selectedGrinder);
    }
  }, [selectedGrinder]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card>
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
                  <div className="p-2 sticky top-0 bg-background z-10 border-b">
                    <Input
                      placeholder="Search grinders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  {filteredGrinders.map((grinder: Grinder) => (
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
              <Label htmlFor="brew-method">Brew Method</Label>
              <Select 
                value={brewMethod} 
                onValueChange={setBrewMethod}
              >
                <SelectTrigger id="brew-method">
                  <SelectValue placeholder="Select a brew method" />
                </SelectTrigger>
                <SelectContent>
                  {BREW_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      {loading && (
        <Card className="mb-6">
          <CardContent className="pt-6 flex justify-center">
            <div className="animate-pulse">Calculating...</div>
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
                  {formatSetting(result.calculated_setting, result.setting_format, result.grinder.clicks_per_number)}
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
                        {method.start_setting && method.end_setting && (
                          <div className="text-sm text-muted-foreground">
                            Settings: {formatSetting(method.start_setting, method.setting_format, result.grinder.clicks_per_number)} - {formatSetting(method.end_setting, method.setting_format, result.grinder.clicks_per_number)}
                          </div>
                        )}
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