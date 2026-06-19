'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import SiteNav from '@/components/SiteNav';

const PLAN_NAMES: Record<string, string> = { essentiel: 'Essentiel', performance: 'Performance', kadria360: 'Performance' };

export default function CheckoutPage() {
  const params = useParams<{ plan?: string | string[] }>();
  const router = useRouter();
  const plan = Array.isArray(params?.plan) ? params.plan[0] : params?.plan;
  const planName = PLAN_NAMES[plan || ''] || plan;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="pt-28 pb-20">
        <div className="container mx-auto max-w-md px-6 text-center space-y-6">
          <h1 className="text-2xl font-bold">Souscrire à {planName}</h1>
          <Card className="p-8 space-y-4">
            <p className="text-muted-foreground text-sm">La page de paiement sera bientôt disponible.</p>
            <p className="text-muted-foreground text-sm">En attendant, réservez une démonstration pour démarrer.</p>
            <Button onClick={() => window.open('https://calendly.com', '_blank')} className="w-full gap-2">
              Réserver une démonstration <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
          <Button variant="link" onClick={() => router.push('/tarifs')}>Retour aux tarifs</Button>
        </div>
      </main>
    </div>
  );
}
