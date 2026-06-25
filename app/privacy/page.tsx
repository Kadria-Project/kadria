import type { Metadata } from 'next';
import { LegalPageLayout, LegalSection } from '@/src/components/legal/LegalPageLayout';

const LAST_UPDATED = '25 juin 2026';

export const metadata: Metadata = {
  title: 'Politique de confidentialité | Kadria',
  description:
    "Découvrez comment Kadria collecte, utilise et protège vos données et celles de vos clients, y compris dans le cadre de l'intégration Google Calendar et de l'assistant vocal.",
  openGraph: {
    title: 'Politique de confidentialité | Kadria',
    description:
      "Découvrez comment Kadria collecte, utilise et protège vos données et celles de vos clients.",
    url: 'https://kadria.fr/privacy',
  },
  alternates: {
    canonical: 'https://kadria.fr/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Politique de confidentialité"
      intro="Comment Kadria collecte, utilise et protège les données de votre compte, de votre activité et de vos clients."
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection title="Présentation">
        <p>
          Kadria est un logiciel SaaS destiné aux artisans pour gérer leurs devis, leurs dossiers
          de projet et le suivi de leurs clients. La présente politique de confidentialité
          explique quelles données sont collectées lorsque vous utilisez Kadria, dans quel but,
          pendant combien de temps elles sont conservées et quels sont vos droits. Elle s'applique
          à tout artisan utilisateur du service ainsi qu'aux personnes dont les données sont
          traitées par un artisan dans le cadre de son activité (ses clients, ses prospects).
        </p>
      </LegalSection>

      <LegalSection title="Responsable du traitement">
        <p>
          Le responsable du traitement des données est Kadria, éditeur du service accessible à
          l'adresse <a href="https://kadria.fr" className="text-green-400 underline-offset-4 hover:underline">kadria.fr</a>.
          Pour toute question relative à vos données personnelles, vous pouvez nous contacter à
          l'adresse <a href="mailto:contact@kadria.fr" className="text-green-400 underline-offset-4 hover:underline">contact@kadria.fr</a>.
        </p>
        <p>Adresse postale du responsable du traitement : À compléter.</p>
      </LegalSection>

      <LegalSection title="Données collectées">
        <p>
          Kadria collecte plusieurs catégories de données dans le cadre du fonctionnement normal
          du service : des données de compte et de profil (nom, email, informations sur votre
          activité d'artisan, plan d'abonnement souscrit) ; des données relatives à vos clients et
          à vos projets que vous saisissez vous-même dans l'outil (devis, dossiers, coordonnées de
          contact, échanges de suivi) ; des données techniques et d'usage nécessaires au bon
          fonctionnement de l'application (journaux de connexion, identifiants de session,
          informations sur le navigateur) ; ainsi que, lorsque vous activez les fonctionnalités
          correspondantes, des données issues de l'intégration Google Calendar et de l'assistant
          vocal, détaillées dans les sections dédiées ci-dessous.
        </p>
      </LegalSection>

      <LegalSection title="Intégration Google Calendar">
        <p>
          Si vous choisissez de connecter votre compte Google Calendar à Kadria, l'application
          demande votre autorisation (via le mécanisme d'authentification OAuth de Google) pour
          lire les événements de votre agenda et y créer ou modifier des événements correspondant
          à vos rendez-vous et interventions planifiés depuis Kadria. Kadria conserve, le temps de
          la connexion active, l'adresse email du compte Google connecté ainsi que les jetons
          d'accès et de rafraîchissement nécessaires pour communiquer avec l'API Google Calendar
          en votre nom.
        </p>
        <p>
          Ces jetons sont stockés de façon sécurisée côté serveur, dans notre base de données, et
          ne sont jamais transmis ni exposés au navigateur. Seul le serveur de Kadria les utilise
          pour effectuer les appels nécessaires à l'affichage et à la création de vos rendez-vous.
          Vous pouvez déconnecter votre compte Google Calendar à tout moment depuis votre espace
          Kadria ; la déconnexion entraîne la suppression des jetons associés.
        </p>
      </LegalSection>

      <LegalSection title="Assistant vocal">
        <p>
          Kadria propose, selon votre formule d'abonnement, un assistant vocal destiné à la
          qualification des appels entrants de vos prospects et clients. Lorsqu'un appel est traité
          par l'assistant vocal, les informations échangées au cours de cet appel (éléments de
          qualification de la demande) sont collectées afin de vous permettre de retrouver le
          contexte de la demande dans votre tableau de bord et d'assurer le suivi commercial
          correspondant.
        </p>
      </LegalSection>

      <LegalSection title="Finalités du traitement">
        <p>
          Vos données sont traitées pour les finalités suivantes : la fourniture et le bon
          fonctionnement du service (gestion de votre compte, de vos devis et de vos dossiers) ;
          la gestion de la facturation et des abonnements via notre prestataire de paiement
          Stripe ; l'assistance et le support technique ; ainsi que l'amélioration continue du
          service.
        </p>
      </LegalSection>

      <LegalSection title="Base légale des traitements">
        <p>
          Le traitement de vos données repose, selon les cas, sur l'exécution du contrat qui vous
          lie à Kadria (fourniture du service, facturation), sur l'intérêt légitime de Kadria à
          assurer la sécurité, la fiabilité et l'amélioration du service, ou sur votre consentement
          explicite lorsque vous activez une fonctionnalité optionnelle telle que l'intégration
          Google Calendar.
        </p>
      </LegalSection>

      <LegalSection title="Durée de conservation">
        <p>
          Vos données sont conservées pendant la durée de votre contrat avec Kadria, puis pour la
          durée nécessaire au respect de nos obligations légales et comptables, notamment en
          matière de facturation. Au-delà de cette durée, les données sont supprimées ou
          anonymisées.
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          L'application Kadria est hébergée par Vercel
          (<a href="https://vercel.com" className="text-green-400 underline-offset-4 hover:underline">vercel.com</a>).
          Les données sont stockées dans la base de données fournie par Supabase, notre
          prestataire de stockage et de gestion de données.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Kadria met en œuvre des mesures techniques raisonnables pour protéger vos données :
          chiffrement des communications en transit (HTTPS), stockage des jetons d'accès tiers
          (par exemple ceux de l'intégration Google Calendar) exclusivement côté serveur sans
          jamais les exposer au navigateur, et un contrôle d'accès limitant l'accès aux données à
          ce qui est strictement nécessaire au fonctionnement du service.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
          d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition sur
          vos données personnelles. Vous pouvez exercer ces droits en nous contactant à l'adresse
          <a href="mailto:contact@kadria.fr" className="text-green-400 underline-offset-4 hover:underline"> contact@kadria.fr</a>.
          Vous disposez également du droit d'introduire une réclamation auprès de la Commission
          Nationale de l'Informatique et des Libertés (CNIL).
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Kadria utilise uniquement un cookie de session technique nécessaire à votre
          authentification (connexion par lien magique) et au maintien de votre session connectée.
          Aucun cookie publicitaire ni outil d'analyse tiers n'est utilisé sur le site à ce jour.
        </p>
      </LegalSection>

      <LegalSection title="Modifications de la politique">
        <p>
          Cette politique de confidentialité peut être amenée à évoluer, notamment pour refléter
          de nouvelles fonctionnalités du service. La date de dernière mise à jour est indiquée en
          haut de cette page.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
