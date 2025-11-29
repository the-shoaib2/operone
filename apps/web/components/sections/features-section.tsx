import Image from "next/image"

export default function FeaturesSection() {
  return (
    <section id="features" className="container space-y-6 py-8 dark:bg-transparent md:py-12 lg:py-24">
      <div className="mx-auto flex max-w-[64rem] flex-col items-center space-y-4 text-center">
        <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl font-bold">
          Features
        </h2>
        <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
          Everything you need to build production-ready applications.
        </p>
      </div>
      <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 max-w-[64rem] md:grid-cols-3">
        <article className="relative overflow-hidden rounded-lg border bg-background p-2">
          <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">⚡</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold">Fast by default</h3>
              <p className="text-sm text-muted-foreground">
                Built on Next.js with Turborepo for lightning fast builds.
              </p>
            </div>
          </div>
        </article>
        <article className="relative overflow-hidden rounded-lg border bg-background p-2">
          <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Image src="/logo/passkey.svg" alt="Passkey" width={24} height={24} />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold">Secure Auth</h3>
              <p className="text-sm text-muted-foreground">
                Authentication ready to go with NextAuth.js and Passkeys.
              </p>
            </div>
          </div>
        </article>
        <article className="relative overflow-hidden rounded-lg border bg-background p-2">
          <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">🌍</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold">Edge Ready</h3>
              <p className="text-sm text-muted-foreground">
                Deploy anywhere with standard web technologies.
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
