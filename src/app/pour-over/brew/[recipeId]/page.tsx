import { BrewingTimer } from '@/components/BrewingTimer'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pour-Over Coffee Brewing Timer',
  description: 'Interactive timer for brewing pour-over coffee. Follow step-by-step instructions with precise water measurements and timing.',
  keywords: ['pour over', 'coffee brewing', 'timer', 'v60', 'chemex', 'kalita'],
}

interface BrewingPageProps {
  params: Promise<{
    recipeId: string;
  }>
}

export default async function BrewingPage({ params }: BrewingPageProps) {
  const { recipeId } = await params;
  
  return (
    <main className="container mx-auto p-4">
      <BrewingTimer recipeId={recipeId} />
    </main>
  )
} 