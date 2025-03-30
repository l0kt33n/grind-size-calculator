"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps, useFieldArray } from "react-hook-form";
import * as z from "zod";

import { createCustomRecipe, formatTime, parseTimeToSeconds } from "@/lib/recipe-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Recipe, Step, InputMode, RecipeMode } from "@/types/recipe";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Trash } from "lucide-react";
import { PlusCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Recipe name must be at least 3 characters.",
  }),
  coffeeWeight: z.coerce
    .number()
    .min(10, { message: "Coffee weight must be at least 10g." })
    .max(100, { message: "Coffee weight must be less than 100g." })
    .optional(),
  waterWeight: z.coerce
    .number()
    .min(150, { message: "Water weight must be at least 150g." })
    .max(2000, { message: "Water weight must be less than 2000g." })
    .optional(),
  ratio: z.coerce
    .number()
    .min(10, { message: "Ratio must be at least 10:1." })
    .max(20, { message: "Ratio must be less than 20:1." }),
  pours: z.coerce
    .number()
    .int()
    .min(1, { message: "At least 1 pour is required." })
    .max(10, { message: "Maximum 10 pours allowed." }),
  bloomMultiplier: z.coerce
    .number()
    .min(1, { message: "Bloom multiplier must be at least 1." })
    .max(5, { message: "Bloom multiplier must be less than 5." }),
  totalBrewTime: z.string().min(3, { message: "Total brew time is required." }),
  inputMode: z.enum(["coffee", "water"]),
  mode: z.enum(["basic", "advanced"]),
  advancedSteps: z.array(
    z.object({
      waterAmount: z.coerce.number().min(1, { message: "Water amount is required" }),
      duration: z.coerce.number().min(1, { message: "Duration is required" }),
      isBloom: z.boolean().optional().default(false),
      description: z.string().optional(),
    })
  ).optional(),
  waterTemperature: z.coerce
    .number()
    .min(0, { message: "Water temperature must be at least 0." })
    .max(100, { message: "Water temperature must be less than 100°C or 212°F." }),
  temperatureUnit: z.enum(["C", "F"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function CustomRecipePage() {
  const router = useRouter();
  const [calculatedCoffeeWeight, setCalculatedCoffeeWeight] = useState<number>(0);
  const [calculatedWaterWeight, setCalculatedWaterWeight] = useState<number>(0);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "My Custom Recipe",
      coffeeWeight: 20,
      waterWeight: 320,
      ratio: 16,
      pours: 4,
      bloomMultiplier: 3,
      totalBrewTime: "2:30",
      inputMode: "coffee",
      mode: "basic",
      advancedSteps: [
        { waterAmount: 60, duration: 45, isBloom: true },
        { waterAmount: 70, duration: 30, isBloom: false },
        { waterAmount: 70, duration: 30, isBloom: false },
        { waterAmount: 70, duration: 30, isBloom: false },
      ],
      waterTemperature: 80,
      temperatureUnit: "C",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "advancedSteps",
  });

  const { watch, setValue } = form;
  const coffeeWeight = watch("coffeeWeight");
  const waterWeight = watch("waterWeight");
  const ratio = watch("ratio");
  const pours = watch("pours");
  const bloomMultiplier = watch("bloomMultiplier");
  const inputMode = watch("inputMode");
  const mode = watch("mode");
  const advancedSteps = watch("advancedSteps");
  const waterTemperature = watch("waterTemperature");
  const temperatureUnit = watch("temperatureUnit");

  // Calculate the dependent values based on the input mode
  useEffect(() => {
    if (inputMode === "coffee" && coffeeWeight) {
      // When coffee weight changes, update the water weight
      const newWaterWeight = coffeeWeight * ratio;
      setCalculatedWaterWeight(newWaterWeight);
    } else if (inputMode === "water" && waterWeight) {
      // When water weight changes, update the coffee weight
      const newCoffeeWeight = Math.round(waterWeight / ratio);
      setCalculatedCoffeeWeight(newCoffeeWeight);
    }
  }, [inputMode, coffeeWeight, waterWeight, ratio]);

  // Set initial values when changing input mode
  useEffect(() => {
    if (inputMode === "coffee") {
      if (coffeeWeight) {
        setCalculatedWaterWeight(coffeeWeight * ratio);
      }
      // Clear water weight field when switching to coffee mode
      setValue("waterWeight", undefined);
    } else {
      if (waterWeight) {
        setCalculatedCoffeeWeight(Math.round(waterWeight / ratio));
      } else {
        // Initialize water weight when switching to water mode
        const initialWaterWeight = (coffeeWeight || 20) * ratio;
        setValue("waterWeight", initialWaterWeight);
        setCalculatedCoffeeWeight(Math.round(initialWaterWeight / ratio));
      }
      // Clear coffee weight field when switching to water mode
      setValue("coffeeWeight", undefined);
    }
  }, [inputMode, setValue, coffeeWeight, waterWeight, ratio]);

  // Update advanced steps when values change in basic mode
  useEffect(() => {
    // Only update if in basic mode
    if (mode !== "basic") return;
    
    // Calculate standard pour sizes for advanced mode
    const currentCoffeeWeight = inputMode === "coffee" 
      ? coffeeWeight || 20 
      : calculatedCoffeeWeight || 20;
      
    const currentWaterWeight = inputMode === "coffee" 
      ? calculatedWaterWeight || (currentCoffeeWeight * ratio) 
      : waterWeight || 320;
    
    const newBloomWater = Math.round(currentCoffeeWeight * bloomMultiplier);
    const remainingWater = currentWaterWeight - newBloomWater;
    const waterPerPour = pours > 0 ? Math.round(remainingWater / pours) : 0;
    
    // Create new advanced steps based on the current pour settings
    const newAdvancedSteps = [
      { waterAmount: newBloomWater, duration: 45, isBloom: true },
    ];
    
    for (let i = 0; i < pours; i++) {
      newAdvancedSteps.push({ waterAmount: waterPerPour, duration: 30, isBloom: false });
    }
    
    setValue("advancedSteps", newAdvancedSteps);
  }, [
    pours, 
    bloomMultiplier, 
    calculatedCoffeeWeight, 
    calculatedWaterWeight, 
    waterWeight, 
    coffeeWeight, 
    inputMode, 
    mode, 
    setValue,
    ratio
  ]);

  // Derived calculations for display
  const totalCoffee = inputMode === "coffee" 
    ? coffeeWeight || 20 
    : calculatedCoffeeWeight || 20;
    
  const totalWater = inputMode === "coffee" 
    ? calculatedWaterWeight || (totalCoffee * ratio) 
    : waterWeight || 320;
    
  const bloomWater = Math.round(totalCoffee * bloomMultiplier);
  const remainingWater = totalWater - bloomWater;
  const waterPerPour = pours > 0 ? Math.round(remainingWater / pours) : 0;

  // Watch for changes in advanced steps to update water total calculation
  const advancedTotalWater = watch('advancedSteps')?.reduce(
    (total, step) => total + (step?.waterAmount || 0), 
    0
  ) || 0;
  
  // Calculate the water difference based on the current total water
  const waterDifference = totalWater - advancedTotalWater;

  // Helper function to convert between temperature units
  const convertTemperature = (temp: number, fromUnit: string, toUnit: string): number => {
    if (fromUnit === toUnit) return temp;
    if (fromUnit === "C" && toUnit === "F") {
      return Math.round((temp * 9/5) + 32);
    } else {
      return Math.round((temp - 32) * 5/9);
    }
  };
  
  // Get the equivalent temperature in the other unit
  const otherUnitTemp = waterTemperature ? 
    convertTemperature(waterTemperature, temperatureUnit, temperatureUnit === "C" ? "F" : "C") : 
    0;

  function onSubmit(values: FormValues) {
    // Convert totalBrewTime from mm:ss format to seconds
    const totalBrewTimeSeconds = parseTimeToSeconds(values.totalBrewTime);
    
    // Prepare advanced steps if in advanced mode
    let advancedStepsForRecipe: Step[] | undefined;
    
    if (values.mode === "advanced" && values.advancedSteps) {
      let currentTime = 0;
      let cumulativeWater = 0;
      
      advancedStepsForRecipe = values.advancedSteps.map((step, index) => {
        const stepTime = currentTime;
        currentTime += step.duration;
        cumulativeWater += step.waterAmount;
        
        return {
          id: `step-${index}`,
          type: step.isBloom ? "bloom" : "pour",
          targetTime: formatTime(stepTime),
          targetTimeInSeconds: stepTime,
          targetWeight: step.waterAmount,
          targetRatio: step.isBloom 
            ? step.waterAmount / totalCoffee 
            : step.waterAmount / totalWater,
          instruction: step.isBloom 
            ? `Pour ${step.waterAmount}g of water to bloom the coffee grounds` 
            : `Pour ${step.waterAmount}g of water in a circular motion (total: ${cumulativeWater}g)`,
          description: step.description || undefined,
        };
      });
      
      // Add a drawdown step
      advancedStepsForRecipe.push({
        id: `step-${advancedStepsForRecipe.length}`,
        type: "drawdown",
        targetTime: formatTime(currentTime),
        targetTimeInSeconds: currentTime,
        targetWeight: 0,
        targetRatio: 0,
        instruction: "Allow remaining water to drain through the coffee bed",
      });
    }
    
    // Create the recipe using the utility function
    const recipe: Recipe = createCustomRecipe({
      coffeeWeight: totalCoffee,
      waterWeight: totalWater,
      ratio: values.ratio,
      pours: values.pours,
      bloomMultiplier: values.bloomMultiplier,
      mode: values.mode,
      inputMode: values.inputMode,
      totalBrewTimeSeconds,
      advancedSteps: advancedStepsForRecipe,
      waterTemperature: values.waterTemperature,
      temperatureUnit: values.temperatureUnit,
    });
    
    // Add the custom name to the recipe
    recipe.name = values.name;
    
    // Store the recipe in localStorage
    const existingRecipes = JSON.parse(localStorage.getItem("customRecipes") || "[]");
    localStorage.setItem("customRecipes", JSON.stringify([...existingRecipes, recipe]));
    
    // Redirect to the brew page with the new recipe
    router.push(`/pour-over/brew/${recipe.id}`);
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Create Custom Recipe</h1>
      
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Recipe Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }: { field: ControllerRenderProps<FormValues, "name"> }) => (
                  <FormItem>
                    <FormLabel>Recipe Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Custom Recipe" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your recipe a unique name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Input Mode Toggle */}
              <div className="space-y-2">
                <FormLabel>Define Recipe By</FormLabel>
                <FormField
                  control={form.control}
                  name="inputMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ToggleGroup
                          type="single"
                          value={field.value}
                          onValueChange={(value) => {
                            if (value) {
                              // Update input mode
                              const newMode = value as InputMode;
                              
                              if (newMode === "coffee") {
                                // When switching to coffee mode, calculate coffee weight from water if needed
                                if (!coffeeWeight && waterWeight) {
                                  const calculatedCoffee = Math.round(waterWeight / ratio);
                                  setValue("coffeeWeight", calculatedCoffee);
                                }
                              } else {
                                // When switching to water mode, calculate water weight from coffee if needed
                                if (!waterWeight && coffeeWeight) {
                                  const calculatedWater = coffeeWeight * ratio;
                                  setValue("waterWeight", calculatedWater);
                                }
                              }
                              
                              field.onChange(newMode);
                            }
                          }}
                          className="justify-start"
                        >
                          <ToggleGroupItem value="coffee">Coffee Weight</ToggleGroupItem>
                          <ToggleGroupItem value="water">Total Water</ToggleGroupItem>
                        </ToggleGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {inputMode === "coffee" ? (
                  <FormField
                    control={form.control}
                    name="coffeeWeight"
                    render={({ field }: { field: ControllerRenderProps<FormValues, "coffeeWeight"> }) => (
                      <FormItem>
                        <FormLabel>Coffee Weight (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="waterWeight"
                    render={({ field }: { field: ControllerRenderProps<FormValues, "waterWeight"> }) => (
                      <FormItem>
                        <FormLabel>Total Water (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="ratio"
                  render={({ field }: { field: ControllerRenderProps<FormValues, "ratio"> }) => (
                    <FormItem>
                      <FormLabel>Water-to-Coffee Ratio</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Water Temperature Input */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="waterTemperature"
                  render={({ field }: { field: ControllerRenderProps<FormValues, "waterTemperature"> }) => (
                    <FormItem>
                      <FormLabel>Water Temperature</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>
                        {temperatureUnit === "C" ? 
                          "Recommended brewing temperature: 88-96°C" : 
                          "Recommended brewing temperature: 190-205°F"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="temperatureUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature Unit</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="C">Celsius (°C)</SelectItem>
                          <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Display calculated values */}
              {inputMode === "coffee" && (
                <div className="rounded-md border p-3 bg-slate-50 dark:bg-slate-900">
                  <div className="text-sm font-medium">Total Water: <span className="font-bold">{calculatedWaterWeight}g</span></div>
                </div>
              )}
              
              {inputMode === "water" && (
                <div className="rounded-md border p-3 bg-slate-50 dark:bg-slate-900">
                  <div className="text-sm font-medium">Coffee Weight: <span className="font-bold">{calculatedCoffeeWeight}g</span></div>
                </div>
              )}
              
              {/* Mode Selector - Basic vs Advanced */}
              <div className="space-y-2">
                <FormLabel>Pouring Steps Definition</FormLabel>
                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Tabs 
                          value={field.value} 
                          onValueChange={(value) => field.onChange(value as RecipeMode)}
                          className="w-full"
                        >
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="basic">Basic Mode</TabsTrigger>
                            <TabsTrigger value="advanced">Advanced Mode</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="basic" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="pours"
                                render={({ field }: { field: ControllerRenderProps<FormValues, "pours"> }) => (
                                  <FormItem>
                                    <FormLabel>Number of Pours</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="bloomMultiplier"
                                render={({ field }: { field: ControllerRenderProps<FormValues, "bloomMultiplier"> }) => (
                                  <FormItem>
                                    <FormLabel>Bloom Multiplier</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <FormField
                              control={form.control}
                              name="totalBrewTime"
                              render={({ field }: { field: ControllerRenderProps<FormValues, "totalBrewTime"> }) => (
                                <FormItem>
                                  <FormLabel>Total Brew Time (mm:ss)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="2:30" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Total brewing time from start to finish
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="rounded-md border p-4 bg-slate-50 dark:bg-slate-900">
                              <h3 className="text-sm font-medium mb-2">Auto-Generated Steps</h3>
                              <div className="space-y-2 text-sm">
                                <div className="p-2 border rounded-md bg-white dark:bg-slate-800">
                                  <div className="font-semibold">Step 1 (Bloom)</div>
                                  <div>Pour {bloomWater}g of water ({waterTemperature || 0}°{temperatureUnit}) to bloom the coffee grounds</div>
                                  <div className="text-slate-500">Wait 45 seconds</div>
                                </div>
                                
                                {Array.from({ length: pours }).map((_, i) => (
                                  <div key={i} className="p-2 border rounded-md bg-white dark:bg-slate-800">
                                    <div className="font-semibold">Step {i + 2}</div>
                                    <div>Pour {waterPerPour}g of water (Total: {bloomWater + waterPerPour * (i + 1)}g)</div>
                                    <div className="text-slate-500">
                                      Wait {(() => {
                                        try {
                                          const totalSeconds = parseTimeToSeconds(watch("totalBrewTime") || "2:30");
                                          const bloomTime = 45; // seconds
                                          const drawdownTime = 60; // seconds
                                          const remainingTime = totalSeconds - bloomTime - drawdownTime;
                                          return Math.max(1, Math.floor(remainingTime / pours));
                                        } catch (error) {
                                          console.error("Error calculating pour time:", error);
                                          return 30; // fallback value
                                        }
                                      })()} seconds
                                    </div>
                                  </div>
                                ))}
                                
                                <div className="p-2 border rounded-md bg-white dark:bg-slate-800">
                                  <div className="font-semibold">Final Step (Drawdown)</div>
                                  <div>Allow water to drain through the coffee bed</div>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="advanced" className="space-y-4 mt-4">
                            <div className="rounded-md border p-4">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-medium">Custom Pour Steps</h3>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => append({ 
                                    waterAmount: 50, 
                                    duration: 30, 
                                    isBloom: false 
                                  })}
                                >
                                  <PlusCircle className="mr-2 h-4 w-4" /> Add Step
                                </Button>
                              </div>
                              
                              <div className="text-sm text-slate-500 mb-4">
                                Define your custom pour steps with specific water amounts and durations.
                                The first step is automatically set as the bloom.
                              </div>
                              
                              <div className="space-y-4">
                                {fields.map((field, index) => {
                                  // Set the first field as bloom by default
                                  if (index === 0 && advancedSteps && advancedSteps[0]) {
                                    // Make sure the first step is always bloom
                                    if (!advancedSteps[0].isBloom) {
                                      const newSteps = [...advancedSteps];
                                      newSteps[0] = { ...newSteps[0], isBloom: true };
                                      setValue("advancedSteps", newSteps);
                                    }
                                  }
                                  
                                  return (
                                    <div key={field.id} className="flex flex-col gap-2 p-3 border rounded-md bg-slate-50 dark:bg-slate-900">
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <FormLabel className={`text-xs ${index === 0 ? "text-blue-600" : ""}`}>
                                            {index === 0 ? "Bloom Water (g)" : "Water (g)"}
                                          </FormLabel>
                                          <Input
                                            type="number"
                                            {...form.register(`advancedSteps.${index}.waterAmount` as const, {
                                              valueAsNumber: true,
                                            })}
                                          />
                                        </div>
                                        
                                        <div className="flex-1">
                                          <FormLabel className="text-xs">Duration (sec)</FormLabel>
                                          <Input
                                            type="number"
                                            {...form.register(`advancedSteps.${index}.duration` as const, {
                                              valueAsNumber: true,
                                            })}
                                          />
                                        </div>
                                        
                                        <input 
                                          type="hidden" 
                                          {...form.register(`advancedSteps.${index}.isBloom` as const)}
                                          value={index === 0 ? "true" : "false"}
                                        />
                                        
                                        {index > 0 && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                          >
                                            <Trash className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <FormLabel className="text-xs">Description (optional)</FormLabel>
                                        <Textarea
                                          placeholder="Add notes or details about this step..."
                                          className="resize-none h-20 text-sm"
                                          {...form.register(`advancedSteps.${index}.description` as const)}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Water total validation */}
                              <div className="mt-4 p-2 rounded-md bg-white dark:bg-slate-800">
                                <div className="text-sm">
                                  Total Water: <span className="font-bold">{advancedTotalWater}g</span>
                                  {Math.abs(waterDifference) > 0 && (
                                    <span className={waterDifference === 0 ? "text-green-600" : "text-amber-600"}>
                                      {" "}
                                      ({waterDifference > 0 ? "+" : ""}{waterDifference}g {waterDifference === 0 ? "✓" : "difference"})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-bold mb-2">Recipe Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Coffee: <span className="font-bold">{totalCoffee}g</span></div>
                  <div>Water: <span className="font-bold">{totalWater}g</span></div>
                  <div>Ratio: <span className="font-bold">1:{ratio}</span></div>
                  <div>Temperature: <span className="font-bold">
                    {waterTemperature || 0}°{temperatureUnit} (
                    {otherUnitTemp}°{temperatureUnit === "C" ? "F" : "C"})
                  </span></div>
                  
                  {mode === "basic" ? (
                    <>
                      <div>Pours: <span className="font-bold">{pours}</span></div>
                      <div>Bloom Water: <span className="font-bold">{bloomWater}g</span></div>
                      <div>Water per Pour: <span className="font-bold">{waterPerPour}g</span></div>
                      <div>Total Brew Time: <span className="font-bold">{watch("totalBrewTime") || "2:30"}</span></div>
                    </>
                  ) : (
                    <>
                      <div>Custom Steps: <span className="font-bold">{fields.length}</span></div>
                      <div>Advanced Total: <span className="font-bold">{advancedTotalWater}g</span></div>
                      <div className={`col-span-2 ${waterDifference === 0 ? "text-green-600" : "text-amber-600"}`}>
                        {Math.abs(waterDifference) > 0 ? (
                          <>{waterDifference > 0 ? "Remaining: " : "Excess: "}<span className="font-bold">{Math.abs(waterDifference)}g</span></>
                        ) : (
                          <>Water amounts match target ✓</>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <Button type="submit" className="w-full">
                Create Recipe
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 