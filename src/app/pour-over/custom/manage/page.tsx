"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Recipe } from "@/types/recipe";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

export default function ManageCustomRecipesPage() {
  const router = useRouter();
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRecipes = localStorage.getItem('customRecipes');
      if (savedRecipes) {
        try {
          setCustomRecipes(JSON.parse(savedRecipes));
        } catch (error) {
          console.error('Error parsing custom recipes:', error);
        }
      }
    }
  }, []);

  const handleEdit = (recipeId: string) => {
    // In the future, implement editing functionality
    // For now, just redirect to create new
    router.push('/pour-over/custom');
  };

  const handleDelete = (recipeId: string) => {
    const updatedRecipes = customRecipes.filter(r => r.id !== recipeId);
    setCustomRecipes(updatedRecipes);
    localStorage.setItem('customRecipes', JSON.stringify(updatedRecipes));
  };

  const handleDeleteAll = () => {
    setCustomRecipes([]);
    localStorage.removeItem('customRecipes');
    setDialogOpen(false);
  };

  const handleSelectForBrewing = (recipe: Recipe) => {
    router.push(`/pour-over/brew/${recipe.id}`);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Custom Recipes</h1>
        
        <div className="flex gap-2">
          <Button onClick={() => router.push('/pour-over/custom')} variant="outline">
            Create New Recipe
          </Button>
          <Button onClick={() => router.push('/pour-over')}>
            Back to Recipes
          </Button>
        </div>
      </div>

      {customRecipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">You haven't created any custom recipes yet.</p>
          <Button onClick={() => router.push('/pour-over/custom')}>
            Create Your First Recipe
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {customRecipes.map((recipe) => (
              <Card key={recipe.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{recipe.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div>Coffee: <span className="font-medium">{recipe.coffeeWeight}g</span></div>
                    <div>Water: <span className="font-medium">{recipe.waterWeight}g</span></div>
                    <div>Ratio: <span className="font-medium">1:{recipe.ratio}</span></div>
                    <div>Pours: <span className="font-medium">{recipe.pours}</span></div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button 
                    onClick={() => handleSelectForBrewing(recipe)} 
                    className="flex-1"
                  >
                    Use This Recipe
                  </Button>
                  <Button 
                    onClick={() => handleDelete(recipe.id)} 
                    variant="destructive" 
                    size="icon"
                  >
                    🗑️
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete All Custom Recipes</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete all your custom recipes.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button variant="destructive" onClick={handleDeleteAll}>
                    Yes, delete all
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
    </div>
  );
} 