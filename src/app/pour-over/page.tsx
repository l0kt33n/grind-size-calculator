import { RecipeSelection } from '@/components/RecipeSelection'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pour-Over Coffee Brewing Guide',
  description: 'Interactive timer and guide for brewing with the pour-over method. Follow step-by-step instructions with precise water measurements and timing.',
  keywords: ['pour over', 'coffee brewing', 'timer', 'recipe', 'guide', 'coffee', 'v60', 'chemex', 'kalita'],
  
  authors: [{ name: 'Coffee Enthusiasts' }],
  openGraph: {
    title: 'Pour-Over Coffee Brewing Guide',
    description: 'Interactive timer and guide for brewing with the pour-over method',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'Pour-Over Coffee Brewing Guide',
    description: 'Interactive timer and guide for brewing with the pour-over method',
  },
}

export default function PourOverPage() {
  return (
    <main className="container mx-auto p-4">
      <RecipeSelection />
    </main>
  )
} 