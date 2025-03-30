import { V60Brewing } from '@/components/V60Brewing'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'V60 Brewing Guide',
  description: 'Interactive timer and guide for brewing with the V60 pour-over method. Follow step-by-step instructions with precise water measurements and timing.',
  keywords: ['v60', 'pour over', 'coffee brewing', 'timer', 'recipe', 'guide', 'coffee'],
  
  authors: [{ name: 'Coffee Enthusiasts' }],
  openGraph: {
    title: 'V60 Brewing Guide',
    description: 'Interactive timer and guide for brewing with the V60 pour-over method',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'V60 Brewing Guide',
    description: 'Interactive timer and guide for brewing with the V60 pour-over method',
  },
}

export default function V60Page() {
  return (
    <main className="container mx-auto p-4">
      <V60Brewing />
    </main>
  )
} 