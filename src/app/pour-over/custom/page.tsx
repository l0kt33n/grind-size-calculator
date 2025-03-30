"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";
import * as z from "zod";

import { createCustomRecipe } from "@/lib/recipe-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Recipe } from "@/types/recipe";

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Recipe name must be at least 3 characters.",
  }),
  coffeeWeight: z.coerce
    .number()
    .min(10, { message: "Coffee weight must be at least 10g." })
    .max(100, { message: "Coffee weight must be less than 100g." }),
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
});

type FormValues = z.infer<typeof formSchema>;

export default function CustomRecipePage() {
  const router = useRouter();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "My Custom Recipe",
      coffeeWeight: 20,
      ratio: 16,
      pours: 4,
      bloomMultiplier: 3,
    },
  });

  const { watch } = form;
  const coffeeWeight = watch("coffeeWeight");
  const ratio = watch("ratio");
  const pours = watch("pours");
  const bloomMultiplier = watch("bloomMultiplier");

  // Derived calculations
  const waterWeight = coffeeWeight * ratio;
  const bloomWater = Math.round(coffeeWeight * bloomMultiplier);
  const remainingWater = waterWeight - bloomWater;
  const waterPerPour = pours > 0 ? Math.round(remainingWater / pours) : 0;

  function onSubmit(values: FormValues) {
    // Create the recipe using the utility function
    const recipe: Recipe = createCustomRecipe({
      coffeeWeight: values.coffeeWeight,
      ratio: values.ratio,
      pours: values.pours,
      bloomMultiplier: values.bloomMultiplier,
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
      
      <Card className="max-w-2xl mx-auto">
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
              
              <div className="grid grid-cols-2 gap-4">
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
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Recipe Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Coffee: <span className="font-bold">{coffeeWeight}g</span></div>
                  <div>Water: <span className="font-bold">{waterWeight}g</span></div>
                  <div>Ratio: <span className="font-bold">1:{ratio}</span></div>
                  <div>Pours: <span className="font-bold">{pours}</span></div>
                  <div>Bloom Water: <span className="font-bold">{bloomWater}g</span></div>
                  <div>Water per Pour: <span className="font-bold">{waterPerPour}g</span></div>
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