import { Metadata } from 'next'
import PricingPage from '@/components/sections/pricing-page'
import Header from '@/components/sections/header'
import Footer from '@/components/sections/footer'

export const metadata: Metadata = {
  title: 'Pricing - Operone',
  description: 'Simple, transparent pricing plans for individuals, professionals, and enterprises. Start with a free trial, no credit card required.',
  keywords: ['pricing', 'plans', 'free trial', 'subscription', 'enterprise'],
  openGraph: {
    title: 'Operone Pricing',
    description: 'Simple pricing for everyone',
    type: 'website',
  },
}

export default function Pricing() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <PricingPage />
      </main>
      <Footer />
    </div>
  )
}
