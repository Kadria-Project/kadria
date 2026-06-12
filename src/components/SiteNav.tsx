import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KadriaLogoImg } from '@/components/KadriaLogo';

export default function SiteNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  const links = [
    { label: 'Accueil', href: '/' },
    { label: 'Fonctionnalités', href: '/fonctionnalites' },
    { label: 'Tarifs', href: '/tarifs' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <KadriaLogoImg />

        <nav className="hidden md:flex items-center gap-8 text-sm">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={e => { e.preventDefault(); nav(l.href); }}
              className={`transition-colors ${pathname === l.href ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav('/pro')} className="hidden sm:inline-flex">Connexion</Button>
          <Button variant="outline" size="sm" onClick={() => window.open('https://calendly.com', '_blank')} className="hidden sm:inline-flex">Réserver une démo</Button>
          <Button size="sm" onClick={() => nav('/demo')}>Tester Kadria</Button>
        </div>
      </div>
    </header>
  );
}
