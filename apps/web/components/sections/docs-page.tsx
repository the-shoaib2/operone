'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Book, Code, Zap, Shield, Globe, Search, ArrowRight, ExternalLink, FileText, Video, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const categories = [
  {
    title: 'Getting Started',
    description: 'Learn the basics and get up and running quickly',
    icon: Zap,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    articles: [
      'Installation Guide',
      'Quick Start Tutorial',
      'Basic Configuration',
      'Your First Project'
    ]
  },
  {
    title: 'API Reference',
    description: 'Complete API documentation and examples',
    icon: Code,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    articles: [
      'Authentication',
      'REST API',
      'GraphQL API',
      'Webhooks'
    ]
  },
  {
    title: 'Security',
    description: 'Security best practices and implementation',
    icon: Shield,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    articles: [
      'Security Overview',
      'OAuth 2.0 Guide',
      'Data Encryption',
      'Security Audits'
    ]
  },
  {
    title: 'Deployment',
    description: 'Deploy your applications to production',
    icon: Globe,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    articles: [
      'Production Setup',
      'CI/CD Pipeline',
      'Environment Variables',
      'Monitoring'
    ]
  }
]

const popularArticles = [
  {
    title: 'Getting Started with Operone',
    description: 'A comprehensive guide to setting up your first project',
    category: 'Getting Started',
    readTime: '5 min read',
    featured: true
  },
  {
    title: 'Authentication & Security',
    description: 'Learn how to implement secure authentication',
    category: 'Security',
    readTime: '8 min read',
    featured: false
  },
  {
    title: 'API Integration Guide',
    description: 'Connect your applications with our REST API',
    category: 'API Reference',
    readTime: '10 min read',
    featured: false
  },
  {
    title: 'Deploying to Production',
    description: 'Best practices for production deployments',
    category: 'Deployment',
    readTime: '12 min read',
    featured: false
  }
]

const resources = [
  {
    title: 'Video Tutorials',
    description: 'Step-by-step video guides',
    icon: Video,
    link: '#'
  },
  {
    title: 'Community Forum',
    description: 'Get help from the community',
    icon: Users,
    link: '#'
  },
  {
    title: 'Blog',
    description: 'Latest updates and tutorials',
    icon: FileText,
    link: '#'
  }
]

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Book className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Documentation
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Everything you need to build amazing applications with Operone
          </p>
          
          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full h-12"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="px-3 py-1">
              <Book className="w-3 h-3 mr-1" />
              Comprehensive
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Code className="w-3 h-3 mr-1" />
              Code Examples
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Video className="w-3 h-3 mr-1" />
              Video Guides
            </Badge>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {categories.map((category, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 group cursor-pointer">
              <CardHeader className="pb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4 group-hover:scale-110 transition-transform">
                  <category.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{category.title}</CardTitle>
                <CardDescription className="text-sm">
                  {category.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {category.articles.map((article, articleIndex) => (
                    <li key={articleIndex} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {article}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Popular Articles */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Popular Articles</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {popularArticles.map((article, index) => (
              <Card key={index} className={`hover:shadow-lg transition-all duration-300 ${article.featured ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {article.category}
                        </Badge>
                        {article.featured && (
                          <Badge className="text-xs">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg mb-2">{article.title}</CardTitle>
                      <CardDescription>{article.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{article.readTime}</span>
                    <Button variant="ghost" size="sm" className="rounded-full">
                      Read More
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Additional Resources</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {resources.map((resource, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <CardHeader className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4 group-hover:scale-110 transition-transform">
                    <resource.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{resource.title}</CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-center">
                  <Button variant="outline" size="sm" className="rounded-full">
                    Explore
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
          <p className="text-muted-foreground mb-6">
            Can't find what you're looking for? Our team is here to help
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="rounded-full">
                Get Started
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="rounded-full">
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
