import Link from "next/link";
import { EyeOff, ShieldCheck, Trash2 } from "lucide-react";
import { DATA_DELETION_ANCHOR, LEGAL_PAGES } from "@/lib/legal";
import { Contact, Editor, EditorCard, LegalPage, Service, type LegalSection } from "./legal-page";

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

const sections: LegalSection[] = [
  {
    id: "responsable",
    title: "Responsable du traitement",
    body: (
      <>
        <p>
          Les données personnelles traitées par <Service /> le sont sous la responsabilité de <Editor />, éditeur du service. Pour toute question ou
          pour exercer vos droits, contactez <Contact />.
        </p>
        <EditorCard />
      </>
    ),
  },
  {
    id: "donnees",
    title: "Données traitées",
    body: (
      <>
        <p>Seules les données nécessaires au fonctionnement du service sont traitées :</p>
        <ul>
          <li>
            <strong>Identification</strong> : identifiant, pseudo, nom affiché, image de profil et adresse e-mail de votre compte Twitch, date de
            création de votre espace et de dernière connexion.
          </li>
          <li>
            <strong>Comptes connectés</strong> (TikTok, YouTube, Instagram, chaîne Twitch) : identifiant et nom du compte, image de profil, nombre
            d&apos;abonnés, autorisations accordées et jetons d&apos;accès délivrés par la plateforme.
          </li>
          <li>
            <strong>Contenus</strong> : vidéos, photos et miniatures importées, titres, descriptions, hashtags, réglages de publication, dates de
            programmation, liens et journal des publications.
          </li>
          <li>
            <strong>Statistiques</strong> : vues, mentions « J&apos;aime », commentaires, partages, enregistrements, abonnés et revenus publicitaires de
            vos propres publications et chaînes ; données d&apos;audience <em>agrégées</em> (répartition par genre, tranche d&apos;âge, pays et villes).
            Aucune donnée individuelle sur vos spectateurs n&apos;est collectée. Pour Twitch : nombre d&apos;abonnés (followers), nombre
            d&apos;abonnements payants par niveau et total des bits, sans conserver l&apos;identité des abonnés.
          </li>
          <li>
            <strong>Revenus</strong> saisis par vous et estimations calculées par le service.
          </li>
          <li>
            <strong>Annonces Discord</strong> : adresses des webhooks que vous ajoutez et réglages des messages.
          </li>
          <li>
            <strong>Données techniques</strong> : cookie de session, journaux techniques de l&apos;hébergeur (adresse IP, date, page demandée).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "finalites",
    title: "Finalités et bases légales",
    body: (
      <ul>
        <li>
          <strong>Fournir le service</strong> (connexion, publication et programmation, statistiques, revenus, annonces Discord) : exécution des
          conditions d&apos;utilisation que vous acceptez (article 6.1.b du RGPD).
        </li>
        <li>
          <strong>Sécuriser le service</strong> et prévenir les abus (contrôle d&apos;accès, journaux techniques) : intérêt légitime de l&apos;Éditeur
          (article 6.1.f).
        </li>
        <li>
          <strong>Répondre à vos demandes</strong> et respecter nos obligations légales (article 6.1.c).
        </li>
      </ul>
    ),
  },
  {
    id: "plateformes",
    title: "Données issues de TikTok, YouTube, Instagram et Twitch",
    body: (
      <>
        <p>
          Les données obtenues grâce aux autorisations que vous accordez servent uniquement à vous fournir les fonctionnalités visibles dans le service :
          publier vos contenus, afficher vos statistiques et calculer vos revenus. Elles ne sont jamais vendues, ni utilisées à des fins publicitaires,
          ni partagées avec d&apos;autres utilisateurs, ni utilisées pour entraîner des modèles d&apos;intelligence artificielle.
        </p>
        <p>
          <Service /> utilise les services d&apos;API YouTube : les{" "}
          <Ext href="https://policies.google.com/privacy">Règles de confidentialité de Google</Ext> s&apos;appliquent aux données traitées par
          YouTube. L&apos;utilisation et le transfert des informations reçues des API Google respectent le{" "}
          <Ext href="https://developers.google.com/terms/api-services-user-data-policy">Règlement sur les données utilisateur des services d&apos;API Google</Ext>,
          y compris les exigences d&apos;utilisation limitée.
        </p>
        <p>
          Pour TikTok, Instagram et Twitch, consultez également la{" "}
          <Ext href="https://www.tiktok.com/legal/privacy-policy">politique de confidentialité de TikTok</Ext>, celle de{" "}
          <Ext href="https://www.facebook.com/privacy/policy">Meta</Ext> et celle de{" "}
          <Ext href="https://www.twitch.tv/p/legal/privacy-notice/">Twitch</Ext>.
        </p>
      </>
    ),
  },
  {
    id: "destinataires",
    title: "Destinataires",
    body: (
      <>
        <p>Vos données ne sont communiquées qu&apos;aux destinataires suivants, et uniquement pour ce qui les concerne :</p>
        <ul>
          <li>
            <strong>les plateformes que vous choisissez</strong> (TikTok, YouTube, Instagram) : le contenu et les réglages d&apos;une publication sont
            transmis à la plateforme au moment de la publier ;
          </li>
          <li>
            <strong>Discord</strong> : le titre, la description et les liens d&apos;une publication, dans les salons que vous avez configurés ;
          </li>
          <li>
            <strong>l&apos;hébergeur du site</strong>, qui stocke les fichiers du service en tant que sous-traitant ;
          </li>
          <li>
            <strong>l&apos;Éditeur</strong>, en tant qu&apos;administrateur, qui voit la liste des espaces (pseudo Twitch, nombre de publications, espace
            utilisé) et n&apos;accède aux fichiers que pour la maintenance ou à votre demande.
          </li>
        </ul>
        <p>
          Les plateformes et Discord peuvent traiter les données que vous leur transmettez hors de l&apos;Union européenne, selon leurs propres politiques
          de confidentialité et les garanties qu&apos;elles mettent en place.
        </p>
      </>
    ),
  },
  {
    id: "conservation",
    title: "Durée de conservation",
    body: (
      <ul>
        <li>Données de votre espace (contenus, statistiques, revenus, réglages) : tant que votre espace existe, puis suppression.</li>
        <li>Jetons d&apos;accès d&apos;une plateforme : jusqu&apos;à ce que vous déconnectiez le compte ou que la plateforme les révoque.</li>
        <li>Fichiers vidéo et photo : tant que la publication correspondante existe dans le service ; supprimez-la pour effacer ses fichiers.</li>
        <li>Cookie de session : 30 jours au maximum ; cookie temporaire de connexion : 10 minutes.</li>
        <li>Journaux techniques de l&apos;hébergeur : selon sa politique, généralement quelques semaines.</li>
      </ul>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        Le service utilise uniquement des cookies strictement nécessaires : un cookie de session qui vous garde connecté et un cookie temporaire
        qui sécurise la connexion à Twitch et aux plateformes. Votre choix de thème (clair ou sombre) est enregistré dans votre navigateur. Aucun
        cookie publicitaire, de mesure d&apos;audience ou de suivi n&apos;est utilisé : aucun consentement n&apos;est donc requis.
      </p>
    ),
  },
  {
    id: "securite",
    title: "Sécurité",
    body: (
      <p>
        Les échanges sont chiffrés (HTTPS). Les données sont stockées dans des fichiers protégés, inaccessibles depuis le web ; les jetons d&apos;accès et
        adresses de webhook ne sont jamais renvoyés au navigateur. Les plateformes qui doivent télécharger un fichier (Instagram, TikTok) reçoivent un
        lien temporaire et signé. Chaque utilisateur n&apos;a accès qu&apos;à son propre espace.
      </p>
    ),
  },
  {
    id: "droits",
    title: "Vos droits",
    body: (
      <>
        <p>
          Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
          limitation, de portabilité et d&apos;opposition, ainsi que du droit de définir des directives sur le sort de vos données après votre décès.
          Pour les exercer, contactez <Contact />. Une réponse vous sera apportée dans un délai d&apos;un mois.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la{" "}
          <Ext href="https://www.cnil.fr/fr/plaintes">CNIL</Ext>.
        </p>
      </>
    ),
  },
  {
    id: DATA_DELETION_ANCHOR,
    title: "Suppression de vos données",
    body: (
      <>
        <p>Vous pouvez à tout moment supprimer tout ou partie de vos données :</p>
        <ol>
          <li>
            <strong>Déconnecter un compte</strong> : page « Comptes » → « Déconnecter » sur TikTok, YouTube, Instagram ou votre chaîne Twitch. Les
            jetons d&apos;accès sont immédiatement effacés du serveur.
          </li>
          <li>
            <strong>Supprimer une publication</strong> : page « Publications » → « Supprimer ». La publication et ses fichiers sont effacés (les contenus
            déjà en ligne restent sur les plateformes, où vous pouvez les supprimer).
          </li>
          <li>
            <strong>Supprimer un webhook Discord</strong> : Paramètres → « Annonces Discord » → « Supprimer ».
          </li>
          <li>
            <strong>Supprimer tout votre espace</strong> : écrivez à <Contact /> depuis l&apos;adresse e-mail de votre compte Twitch, en indiquant votre
            pseudo. Votre espace et toutes ses données (comptes, contenus, statistiques, revenus) sont supprimés sous 30 jours au plus, et une
            confirmation vous est envoyée.
          </li>
        </ol>
        <p>Vous pouvez aussi retirer l&apos;accès du service directement depuis chaque plateforme :</p>
        <ul>
          <li>
            Google / YouTube : <Ext href="https://security.google.com/settings/security/permissions">page des autorisations de votre compte Google</Ext> ;
          </li>
          <li>TikTok : application TikTok → Profil → Paramètres et confidentialité → Sécurité et autorisations → Applications et services ;</li>
          <li>Instagram : Paramètres → Applications et sites web (ou, via Facebook, Paramètres → Intégrations professionnelles) ;</li>
          <li>Twitch : Paramètres → Connexions → Autres connexions → Déconnecter ;</li>
          <li>Discord : Paramètres du salon → Intégrations → Webhooks → supprimer le webhook.</li>
        </ul>
      </>
    ),
  },
  {
    id: "mineurs",
    title: "Mineurs",
    body: (
      <p>
        Le service s&apos;adresse aux créateurs ayant l&apos;âge requis par les plateformes connectées. En France, l&apos;inscription d&apos;un mineur de
        moins de 15 ans nécessite l&apos;accord d&apos;un titulaire de l&apos;autorité parentale.
      </p>
    ),
  },
  {
    id: "modifications",
    title: "Modifications",
    body: (
      <p>
        Cette politique peut être mise à jour pour suivre l&apos;évolution du service ou de la réglementation. La date de mise à jour figure en haut de
        la page ; en cas de changement important, vous en serez informé dans le service. Voir aussi les{" "}
        <Link href={LEGAL_PAGES.terms.path}>conditions d&apos;utilisation</Link>.
      </p>
    ),
  },
];

export function PrivacyPolicy() {
  return (
    <LegalPage
      current="privacy"
      intro={
        <p>
          Cette politique explique quelles données <Service /> utilise lorsque vous publiez sur TikTok, YouTube et Instagram, pourquoi, avec qui elles
          sont partagées et comment les supprimer.
        </p>
      }
      highlights={[
        { icon: <EyeOff />, title: "Ni publicité, ni revente", text: "Vos données servent uniquement à faire fonctionner le service." },
        { icon: <ShieldCheck />, title: "Le strict nécessaire", text: "Statistiques agrégées, aucune donnée individuelle sur vos spectateurs." },
        { icon: <Trash2 />, title: "Vous gardez la main", text: "Déconnexion des comptes et suppression de l'espace à tout moment." },
      ]}
      sections={sections}
    />
  );
}
