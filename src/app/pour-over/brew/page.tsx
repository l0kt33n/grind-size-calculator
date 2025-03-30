import { BrewingTimer } from '@/components/BrewingTimer'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pour-Over Coffee Brewing Timer',
  description: 'Interactive timer for brewing pour-over coffee. Follow step-by-step instructions with precise water measurements and timing.',
  keywords: ['pour over', 'coffee brewing', 'timer', 'v60', 'chemex', 'kalita'],
}

export default function BrewingPage() {
  return (
    <main className="container mx-auto p-4">
      <BrewingTimer />
    </main>
  )
} 