import Header from "@/components/sections/header"
import HeroSection from "@/components/sections/hero-section"
import FeaturesSection from "@/components/sections/features-section"
import { ReviewSection } from "@/components/sections/review-section"
import Footer from "@/components/sections/footer"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen max-w-7xl mx-auto">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <ReviewSection />
      </main>
      <Footer />
    </div>
  )
}
