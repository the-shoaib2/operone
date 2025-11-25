import { Button } from "@repo/ui"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Zap, Globe } from "lucide-react"
import Image from "next/image"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Image src="/logo/passkey.svg" alt="Operone" width={24} height={24} className="h-6 w-6" />
              <span className="hidden font-bold sm:inline-block">
                Operone
              </span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link href="#features" className="transition-colors hover:text-foreground/80 text-foreground/60">
                Features
              </Link>
              <Link href="#pricing" className="transition-colors hover:text-foreground/80 text-foreground/60">
                Pricing
              </Link>
              <Link href="/docs" className="transition-colors hover:text-foreground/80 text-foreground/60">
                Docs
              </Link>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
            </div>
            <nav className="flex items-center space-x-2">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
            <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              The Modern Stack for <br className="hidden sm:inline" />
              <span className="text-primary">Rapid Development</span>
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Build faster with our pre-configured monorepo. Includes Next.js,
              Tailwind CSS, TypeScript, and authentication out of the box.
            </p>
            <div className="space-x-4">
              <Link href="/login">
                <Button size="lg" className="h-11 px-8">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="https://github.com" target="_blank" rel="noreferrer">
                <Button variant="outline" size="lg" className="h-11 px-8">
                  GitHub
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl font-bold">
              Features
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Everything you need to build production-ready applications.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Zap className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Fast by default</h3>
                  <p className="text-sm text-muted-foreground">
                    Built on Next.js with Turborepo for lightning fast builds.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Image src="/logo/passkey.svg" alt="Passkey" width={48} height={48} className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Secure Auth</h3>
                  <p className="text-sm text-muted-foreground">
                    Authentication ready to go with NextAuth.js and Passkeys.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Globe className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Edge Ready</h3>
                  <p className="text-sm text-muted-foreground">
                    Deploy anywhere with standard web technologies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Operone
            </a>
            . The source code is available on{" "}
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  )
}
