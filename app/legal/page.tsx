import type { Metadata } from 'next';
import { LegalPageLayout, LegalSection, LegalField, ToComplete } from '@/src/components/legal/LegalPageLayout';

const LAST_UPDATED = '25 juin 2026';

export const metadata: Metadata = {
  title: 'Mentions légales | Kadria',
  description: 'Mentions légales du site et du service Kadria : édition, hébergement, propriété intellectuelle et contact.',
  openGraph: {
    title: 'Mentions légales | Kadria',
    description: 'Mentions légales du site et du service Kadria.',
    url: 'https://kadria.fr/legal',
  },
  alternates: {
    canonical: 'https://kadria.fr/legal',
  },
};

export default function LegalPage() {
  return (
    <LegalPageLayout
      title="Mentions légales"
      intro="Informations légales relatives à l'édition et à l'hébergement du site et du service Kadria."
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection title="Éditeur du site">
        <div className="divide-y divide-white/5">
          <LegalField label="Nom" value="Kadria" />
          <LegalField
            label="Site"
            value={
              <a href="https://kadria.fr" className="text-green-400 underline-offset-4 hover:underline">
                https://kadria.fr
              </a>
            }
          />
          <LegalField
            label="Email"
            value={
              <a href="mailto:contact@kadria.fr" className="text-green-400 underline-offset-4 hover:underline">
                contact@kadria.fr
              </a>
            }
          />
          <LegalField label="SIREN" value={<ToComplete />} />
          <LegalField label="N° TVA intracommunautaire" value={<ToComplete />} />
          <LegalField label="Adresse du siège" value={<ToComplete />} />
          <LegalField label="Capital social" value={<ToComplete />} />
          <LegalField label="Directeur de publication" value={<ToComplete />} />
        </div>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          Le site et l'application Kadria sont hébergés par Vercel
          (<a href="https://vercel.com" className="text-green-400 underline-offset-4 hover:underline">vercel.com</a>).
          Les données de l'application sont stockées dans la base de données fournie par Supabase,
          notre prestataire de stockage et de gestion de données.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L'ensemble du contenu présent sur ce site (textes, marque, logo, charte graphique,
          interface) est protégé par le droit de la propriété intellectuelle. Toute reproduction,
          représentation, modification ou exploitation, totale ou partielle, sans autorisation
          préalable de Kadria, est interdite.
        </p>
      </LegalSection>

      <LegalSection title="Responsabilité">
        <p>
          Kadria s'efforce d'assurer l'exactitude des informations diffusées sur ce site, sans
          pouvoir garantir qu'elles soient exemptes d'inexactitudes ou d'omissions. Kadria ne
          saurait être tenu responsable des dommages résultant de l'utilisation du site, dans la
          mesure permise par la loi applicable.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter à
          l'adresse{' '}
          <a href="mailto:contact@kadria.fr" className="text-green-400 underline-offset-4 hover:underline">
            contact@kadria.fr
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
