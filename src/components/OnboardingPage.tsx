import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Rocket } from 'lucide-react';
import SiteNav from '@/components/SiteNav';

export default function OnboardingPage() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="pt-28 pb-20">
        <div className="container mx-auto max-w-md px-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Bienvenue sur Kadria</h1>
          <p className="text-muted-foreground">Votre espace sera bientôt prêt. Nous préparons votre configuration personnalisée.</p>
          <Card className="p-6 text-left space-y-3">
            <p className="text-sm font-medium">Prochaines étapes :</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>1. Configuration de votre profil entreprise</li>
              <li>2. Personnalisation de votre assistant</li>
              <li>3. Connexion de votre numéro de téléphone</li>
              <li>4. Mise en ligne</li>
            </ul>
          </Card>
          <Button onClick={() => nav('/pro')} className="gap-2">Accéder au dashboard <ArrowRight className="w-4 h-4" /></Button>
        </div>
      </main>
    </div>
  );
}
