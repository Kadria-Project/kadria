import { useEffect } from 'react';
import { KadriaLogoImg } from '@/components/KadriaLogo';
import PricingHero from '@/components/pricing/PricingHero';
import PricingQuiz from '@/components/pricing/PricingQuiz';
import PricingCards from '@/components/pricing/PricingCards';
import ComparisonTable from '@/components/pricing/ComparisonTable';
import ROISection from '@/components/pricing/ROISection';
import FounderOffer from '@/components/pricing/FounderOffer';
import PricingFAQ from '@/components/pricing/PricingFAQ';
import PricingCTA from '@/components/pricing/PricingCTA';
import SiteNav from '@/components/SiteNav';

export default function PricingPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <PricingHero />
      <PricingQuiz />
      <PricingCards />
      <ComparisonTable />
      <ROISection />
      <FounderOffer />
      <PricingFAQ />
      <PricingCTA />

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto max-w-[1200px] px-6 text-center">
          <KadriaLogoImg className="justify-center mb-4" />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Kadria. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
