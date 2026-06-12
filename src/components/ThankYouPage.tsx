import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import SiteNav from '@/components/SiteNav';

export default function ThankYouPage() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="pt-28 pb-20">
        <div className="container mx-auto max-w-md px-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Merci !</h1>
          <p className="text-muted-foreground">Votre demande a bien été prise en compte. Nous vous recontacterons rapidement pour la mise en place.</p>
          <Button onClick={() => nav('/')} className="gap-2">Retour à l'accueil <ArrowRight className="w-4 h-4" /></Button>
        </div>
      </main>
    </div>
  );
}
