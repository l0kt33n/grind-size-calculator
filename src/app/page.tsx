import { GrinderCalculator } from '@/components/GrinderCalculator'
import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Coffee Grinder Size Calculator',
  description: 'Calculate the perfect grind settings for your coffee grinder. Find the right grind size for Turkish, Espresso, Pour Over, French Press, and more.',
  keywords: ['coffee grinder', 'grind size', 'calculator', 'coffee', 'espresso', 'pour over', 'french press', '1Zpresso'],

  authors: [{ name: 'Coffee Enthusiasts' }],
  openGraph: {
    title: 'Coffee Grinder Size Calculator',
    description: 'Calculate the perfect grind settings for your coffee grinder',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'Coffee Grinder Size Calculator',
    description: 'Calculate the perfect grind settings for your coffee grinder',
  },
}

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Coffee Grinder Size Calculator</h1>
      
      <div className="flex justify-center mb-8">
        <Link href="/pour-over">
          <Button className="text-lg px-6 py-2">Pour-Over Brewing Guide</Button>
        </Link>
      </div>
      
      <GrinderCalculator />
    </main>
  )
} 