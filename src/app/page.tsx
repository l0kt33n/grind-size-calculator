import { Calculator } from '@/components/Calculator'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '1Zpresso Grind Calculator',
  description: 'Calculate the perfect grind settings for your 1Zpresso coffee grinder. Find the right grind size for Turkish, Espresso, Pour Over, French Press, and more.',
  keywords: ['1Zpresso', 'coffee grinder', 'grind size', 'calculator', 'coffee', 'espresso', 'pour over', 'french press'],

  authors: [{ name: 'Coffee Enthusiasts' }],
  openGraph: {
    title: '1Zpresso Grind Calculator',
    description: 'Calculate the perfect grind settings for your 1Zpresso coffee grinder',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: '1Zpresso Grind Calculator',
    description: 'Calculate the perfect grind settings for your 1Zpresso coffee grinder',

  },
}

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <Calculator />
    </main>
  )
} 