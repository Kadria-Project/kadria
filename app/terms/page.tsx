import type { Metadata } from 'next';
import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';

const LAST_UPDATED = '25 juin 2026';

export const metadata: Metadata = {
  title: 'Conditions générales d’utilisation | Kadria',
  description:
    'Conditions générales d’utilisation du service Kadria : gestion de devis et de dossiers, abonnement, intégration Google Calendar, assistant vocal.',
  openGraph: {
    title: 'Conditions générales d’utilisation | Kadria',
    description:
      'Conditions générales d’utilisation du service Kadria.',
    url: 'https://kadria.fr/terms',
  },
  alternates: {
    canonical: 'https://kadria.fr/terms',
  },
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Conditions générales d'utilisation"
      intro="Les règles applicables à l'utilisation du service Kadria par les artisans et leurs équipes."
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection title="Objet">
        <p>
          Les présentes conditions générales d'utilisation (« CGU ») ont pour objet de définir les
          modalités et conditions dans lesquelles Kadria met son service à la disposition des
          artisans et de leurs équipes, ainsi que les droits et obligations des parties dans ce
          cadre. Toute utilisation du service Kadria implique l'acceptation pleine et entière des
          présentes CGU.
        </p>
      </LegalSection>

      <LegalSection title="Description du service">
        <p>
          Kadria est un logiciel SaaS destiné aux artisans, permettant notamment de créer et
          suivre des devis, de gérer des dossiers de projet, et d'assurer le suivi commercial de
          leurs clients et prospects. Le service propose des formules d'abonnement payantes dont
          la facturation est assurée par notre prestataire de paiement Stripe. Selon la formule
          souscrite, Kadria peut également proposer une intégration avec Google Calendar pour la
          synchronisation des rendez-vous, ainsi qu'un assistant vocal de qualification des appels
          entrants.
        </p>
      </LegalSection>

      <LegalSection title="Compte utilisateur">
        <p>
          L'accès au service nécessite la création d'un compte, notamment via une authentification
          par lien magique envoyé par email. Vous êtes responsable de la confidentialité des
          moyens d'accès à votre compte et de toute activité réalisée depuis celui-ci. Vous vous
          engagez à fournir des informations exactes lors de la création de votre compte.
        </p>
      </LegalSection>

      <LegalSection title="Utilisation du service">
        <p>
          Vous vous engagez à utiliser Kadria conformément à sa destination et à la réglementation
          applicable, notamment en matière de protection des données de vos clients. Toute
          utilisation frauduleuse, abusive, ou portant atteinte au bon fonctionnement du service ou
          aux droits de tiers est strictement interdite et peut entraîner la suspension ou la
          résiliation de votre accès.
        </p>
      </LegalSection>

      <LegalSection title="Disponibilité du service">
        <p>
          Kadria met en œuvre des moyens raisonnables pour assurer la disponibilité et la
          continuité du service, sans pouvoir garantir une disponibilité de 100 %. Des interruptions
          peuvent survenir, notamment pour des opérations de maintenance ou en cas de panne d'un
          prestataire tiers (hébergement, paiement, intégrations). Kadria ne pourra être tenu
          responsable des conséquences de telles interruptions dans la mesure permise par la loi.
        </p>
      </LegalSection>

      <LegalSection title="Données">
        <p>
          Le traitement des données personnelles dans le cadre de l'utilisation du service Kadria
          est décrit en détail dans notre{' '}
          <a href="/privacy" className="text-green-400 underline-offset-4 hover:underline">
            politique de confidentialité
          </a>
          , qui fait partie intégrante des présentes conditions.
        </p>
      </LegalSection>

      <LegalSection title="Intégrations tierces">
        <p>
          Lorsque vous activez l'intégration Google Calendar, vous donnez votre consentement
          explicite via le mécanisme d'authentification OAuth de Google. Cette autorisation est
          révocable à tout moment, depuis votre espace Kadria ou directement depuis les paramètres
          de votre compte Google. L'utilisation de cette intégration reste également soumise aux
          conditions d'utilisation propres à Google.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Le service Kadria, sa marque, son interface, ses contenus et sa documentation sont
          protégés par le droit de la propriété intellectuelle. Aucune reproduction, représentation
          ou exploitation, totale ou partielle, n'est autorisée sans accord préalable de Kadria,
          à l'exception des données que vous créez vous-même dans l'outil (vos devis, vos dossiers,
          vos données clients), qui restent votre propriété.
        </p>
      </LegalSection>

      <LegalSection title="Responsabilité">
        <p>
          Kadria s'efforce d'assurer l'exactitude et la fiabilité du service mais ne saurait être
          tenu responsable des dommages indirects résultant de l'utilisation ou de l'impossibilité
          d'utiliser le service, dans la mesure permise par la loi applicable. Il vous appartient
          de vérifier l'exactitude des devis, dossiers et données générés ou synchronisés via
          Kadria avant toute utilisation à des fins contractuelles avec vos propres clients.
        </p>
      </LegalSection>

      <LegalSection title="Résiliation">
        <p>
          Vous pouvez résilier votre abonnement à tout moment depuis votre espace Kadria, selon les
          modalités prévues par votre formule d'abonnement. Kadria peut suspendre ou résilier votre
          accès en cas de manquement grave aux présentes CGU, après vous en avoir informé dans la
          mesure du possible.
        </p>
      </LegalSection>

      <LegalSection title="Évolution des conditions">
        <p>
          Les présentes CGU peuvent être modifiées à tout moment afin de refléter l'évolution du
          service ou de la réglementation applicable. La date de dernière mise à jour est indiquée
          en haut de cette page.
        </p>
      </LegalSection>

      <LegalSection title="Droit applicable">
        <p>
          Les présentes CGU sont soumises au droit français.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question relative aux présentes conditions générales d'utilisation, vous
          pouvez nous contacter à l'adresse{' '}
          <a href="mailto:contact@kadria.fr" className="text-green-400 underline-offset-4 hover:underline">
            contact@kadria.fr
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
