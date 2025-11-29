'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, Shield, Globe, Code, Users, Settings, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built with performance in mind. Native performance with minimal resource usage.',
    badge: 'Performance',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
  },
  {
    icon: Shield,
    title: 'Secure by Design',
    description: 'End-to-end encryption, secure authentication, and regular security updates.',
    badge: 'Security',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
  },
  {
    icon: Globe,
    title: 'Cross-Platform',
    description: 'Works seamlessly across Windows, macOS, and Linux with consistent experience.',
    badge: 'Universal',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
  },
  {
    icon: Code,
    title: 'Developer Friendly',
    description: 'Comprehensive APIs, SDKs, and documentation for seamless integration.',
    badge: 'Developer',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Real-time collaboration, sharing, and team management features.',
    badge: 'Collaboration',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
  },
  {
    icon: Settings,
    title: 'Highly Customizable',
    description: 'Extensive configuration options to tailor the experience to your needs.',
    badge: 'Flexible',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400'
  }
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Powerful Features
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Everything you need to build, deploy, and manage your applications with confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="px-3 py-1">
              <Zap className="w-3 h-3 mr-1" />
              Fast
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Shield className="w-3 h-3 mr-1" />
              Secure
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Globe className="w-3 h-3 mr-1" />
              Global
            </Badge>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge className={feature.color} variant="secondary">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span>Enterprise ready</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span>24/7 support</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span>Regular updates</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Technical Features */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Technical Excellence</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="w-5 h-5 mr-2" />
                  Modern Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    <span>Next.js 14 with App Router</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    <span>TypeScript for type safety</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    <span>Tailwind CSS for styling</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    <span>Prisma for database management</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security First
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    <span>End-to-end encryption</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    <span>OAuth 2.0 authentication</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    <span>Rate limiting and DDoS protection</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    <span>Regular security audits</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of developers building amazing applications with Operone
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="rounded-full">
                Start Building
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="outline" size="lg" className="rounded-full">
                Read Documentation
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
