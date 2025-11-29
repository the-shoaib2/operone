'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Free',
    description: 'Perfect for individuals and small projects',
    price: '$0',
    period: 'forever',
    badge: null,
    featured: false,
    features: [
      { included: true, text: 'Up to 3 projects' },
      { included: true, text: 'Basic analytics' },
      { included: true, text: 'Community support' },
      { included: true, text: '1GB storage' },
      { included: true, text: 'Basic integrations' },
      { included: false, text: 'Advanced security' },
      { included: false, text: 'Priority support' },
      { included: false, text: 'Custom domains' },
    ]
  },
  {
    name: 'Pro',
    description: 'For professionals and growing teams',
    price: '$29',
    period: 'per month',
    badge: 'Most Popular',
    featured: true,
    features: [
      { included: true, text: 'Unlimited projects' },
      { included: true, text: 'Advanced analytics' },
      { included: true, text: 'Priority support' },
      { included: true, text: '100GB storage' },
      { included: true, text: 'All integrations' },
      { included: true, text: 'Advanced security' },
      { included: true, text: 'Team collaboration' },
      { included: false, text: 'Custom domains' },
    ]
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    price: 'Custom',
    period: 'pricing',
    badge: 'Advanced',
    featured: false,
    features: [
      { included: true, text: 'Unlimited everything' },
      { included: true, text: 'Custom analytics' },
      { included: true, text: 'Dedicated support' },
      { included: true, text: 'Unlimited storage' },
      { included: true, text: 'Custom integrations' },
      { included: true, text: 'Enterprise security' },
      { included: true, text: 'Advanced collaboration' },
      { included: true, text: 'Custom domains & branding' },
    ]
  }
]

const faqs = [
  {
    question: 'Can I change my plan anytime?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and we\'ll prorate any differences.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, PayPal, and wire transfers for enterprise customers.'
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer: 'Yes, all paid plans come with a 14-day free trial. No credit card required to start.'
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'You can cancel your subscription at any time. Your access will continue until the end of your billing period.'
  },
  {
    question: 'Do you offer discounts for nonprofits?',
    answer: 'Yes, we offer 50% discounts for qualified nonprofit organizations. Contact our sales team for details.'
  },
  {
    question: 'What is your refund policy?',
    answer: 'We offer a 30-day money-back guarantee for all paid plans. If you\'re not satisfied, we\'ll refund your payment.'
  }
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Star className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Choose the perfect plan for your needs. No hidden fees, no surprises.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="px-3 py-1">
              14-day free trial
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              No credit card required
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              Cancel anytime
            </Badge>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                plan.featured ? 'ring-2 ring-primary scale-105' : ''
              }`}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-b-none rounded-tl-none rounded-tr-sm">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full rounded-full" 
                    variant={plan.featured ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                    {plan.name !== 'Enterprise' && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help you find the perfect plan for your needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="rounded-full">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="rounded-full">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
