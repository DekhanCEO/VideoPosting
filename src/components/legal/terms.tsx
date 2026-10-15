import Link from "next/link";
import { FileCheck2, Hand, Scale } from "lucide-react";
import { DATA_DELETION_ANCHOR, LEGAL_PAGES } from "@/lib/legal";
import { Contact, Editor, EditorCard, LegalPage, Service, type LegalSection } from "./legal-page";

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

const privacy = LEGAL_PAGES.privacy.path;

const sections: LegalSection[] = [
  {
    id: "objet",
    title: "Objet et acceptation",
    body: (
      <>
        <p>
          Les présentes conditions d&apos;utilisation (les « Conditions ») encadrent l&apos;accès à <Service /> et son utilisation. En vous
          connectant au service, vous reconnaissez avoir lu et accepté les Conditions ainsi que la{" "}
          <Link href={privacy}>politique de confidentialité</Link>. Si vous ne les acceptez pas, n&apos;utilisez pas le service.
        </p>
      </>
    ),
  },
  {
    id: "editeur",
    title: "Éditeur du service",
    body: (
      <>
        <p>
          <Service /> est édité et exploité par <Editor /> (l&apos;« Éditeur »). Pour toute question, vous pouvez contacter <Contact />.
        </p>
        <EditorCard />
      </>
    ),
  },
  {
    id: "service",
    title: "Description du service",
    body: (
      <>
        <p>
          <Service /> est un outil destiné aux créateurs de contenu. Il permet notamment :
        </p>
        <ul>
          <li>de préparer une publication (vidéo ou photos, titre, description, hashtags) et de l&apos;envoyer sur TikTok, YouTube et Instagram, immédiatement ou à une date programmée ;</li>
          <li>de régler les options propres à chaque plateforme (visibilité, commentaires, format Short ou vidéo longue, Reel ou carrousel, etc.) ;</li>
          <li>de consulter des statistiques (vues, interactions, abonnés, taux d&apos;influence) et des données d&apos;audience agrégées fournies par les plateformes ;</li>
          <li>de suivre ses revenus, saisis manuellement, importés (revenus publicitaires YouTube) ou estimés ;</li>
          <li>d&apos;annoncer automatiquement ses publications dans des salons Discord.</li>
        </ul>
        <p>
          Le service agit uniquement sur instruction de l&apos;utilisateur : aucun contenu n&apos;est publié sans une action de votre part (publication
          immédiate ou programmation).
        </p>
      </>
    ),
  },
  {
    id: "acces",
    title: "Accès au service et compte",
    body: (
      <>
        <p>
          La connexion se fait avec votre compte Twitch (ou, pour une installation privée, avec le mot de passe défini par l&apos;Éditeur). Twitch
          sert uniquement à vous identifier. L&apos;accès est accordé par l&apos;Éditeur, qui peut le limiter à certaines personnes, le refuser ou le
          retirer. Chaque utilisateur dispose d&apos;un espace personnel, séparé de celui des autres.
        </p>
        <p>
          Vous devez avoir l&apos;âge minimum exigé par chacune des plateformes que vous connectez et, si vous avez moins de 15 ans, l&apos;accord
          d&apos;un titulaire de l&apos;autorité parentale. Vous êtes responsable de la sécurité de vos comptes et de toute action effectuée depuis votre
          espace ; signalez sans délai à l&apos;Éditeur toute utilisation non autorisée.
        </p>
      </>
    ),
  },
  {
    id: "plateformes",
    title: "Comptes TikTok, YouTube, Instagram, Twitch et Discord",
    body: (
      <>
        <p>
          Pour publier ou consulter vos statistiques, vous autorisez <Service /> à accéder à vos comptes via les procédures officielles de connexion
          (OAuth) des plateformes. Vous choisissez les autorisations accordées et pouvez les retirer à tout moment, depuis la page « Comptes » du
          service ou depuis les paramètres de chaque plateforme.
        </p>
        <p>Votre utilisation de ces plateformes reste soumise à leurs propres conditions, que vous vous engagez à respecter :</p>
        <ul>
          <li>
            <strong>YouTube</strong> : <Service /> utilise les services d&apos;API YouTube. En utilisant les fonctionnalités YouTube du service, vous
            acceptez les <Ext href="https://www.youtube.com/t/terms">Conditions d&apos;utilisation de YouTube</Ext> ; les{" "}
            <Ext href="https://policies.google.com/privacy">Règles de confidentialité de Google</Ext> s&apos;appliquent.
          </li>
          <li>
            <strong>TikTok</strong> : <Ext href="https://www.tiktok.com/legal/terms-of-service">Conditions d&apos;utilisation de TikTok</Ext>, règles de la
            communauté et, lors d&apos;une publication directe, la{" "}
            <Ext href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en">Music Usage Confirmation</Ext>.
          </li>
          <li>
            <strong>Instagram</strong> : <Ext href="https://help.instagram.com/581066165581870">Conditions d&apos;utilisation d&apos;Instagram</Ext> et règles
            de Meta.
          </li>
          <li>
            <strong>Twitch</strong> : <Ext href="https://www.twitch.tv/p/legal/terms-of-service/">Conditions d&apos;utilisation de Twitch</Ext>.
          </li>
          <li>
            <strong>Discord</strong> : <Ext href="https://discord.com/terms">Conditions d&apos;utilisation de Discord</Ext>.
          </li>
        </ul>
        <p>
          <Service /> n&apos;est ni affilié, ni approuvé, ni sponsorisé par TikTok, Google/YouTube, Meta/Instagram, Twitch ou Discord. Leurs noms et
          logos sont des marques de leurs propriétaires respectifs.
        </p>
      </>
    ),
  },
  {
    id: "contenus",
    title: "Vos contenus",
    body: (
      <>
        <p>
          Vous restez propriétaire des vidéos, photos et textes que vous importez. Vous accordez à l&apos;Éditeur, pour la seule durée nécessaire,
          le droit de les stocker, de les traiter techniquement (par exemple pour générer une miniature ou convertir une photo) et de les transmettre
          aux plateformes et salons Discord que vous avez choisis. Aucun autre usage n&apos;en est fait.
        </p>
        <p>Vous garantissez que vos contenus :</p>
        <ul>
          <li>vous appartiennent ou que vous disposez de toutes les autorisations nécessaires (musiques, images, marques, personnes filmées) ;</li>
          <li>respectent la loi et les règles des plateformes (droits d&apos;auteur, vie privée, contenus interdits, protection des mineurs) ;</li>
          <li>signalent clairement tout partenariat ou contenu sponsorisé, à l&apos;aide des options de divulgation prévues par les plateformes.</li>
        </ul>
        <p>
          L&apos;Éditeur n&apos;exerce aucun contrôle préalable sur vos contenus mais peut retirer un contenu manifestement illicite qui lui est
          signalé et suspendre l&apos;accès correspondant.
        </p>
      </>
    ),
  },
  {
    id: "publication",
    title: "Publication et programmation",
    body: (
      <>
        <p>
          Lorsque vous publiez ou programmez une publication, le service transmet le contenu et les réglages choisis à chaque plateforme. La mise en
          ligne effective, la visibilité et la durée de traitement dépendent ensuite de la plateforme, qui peut refuser, limiter ou retirer un
          contenu selon ses propres règles. Certaines plateformes limitent aussi les applications non encore validées (par exemple, publication
          privée uniquement).
        </p>
        <p>
          Les publications programmées partent à l&apos;heure prévue si le serveur est disponible à ce moment-là ; un léger décalage est possible.
          Vérifiez vos contenus et réglages avant de publier : une publication en ligne se gère ensuite directement sur la plateforme concernée.
        </p>
      </>
    ),
  },
  {
    id: "statistiques",
    title: "Statistiques et revenus",
    body: (
      <p>
        Les statistiques proviennent des plateformes et peuvent être incomplètes ou mises à jour avec retard. Les revenus estimés (TikTok, Instagram,
        Twitch) sont des approximations calculées à partir de vos réglages : ils ont une valeur indicative et ne constituent ni un relevé officiel, ni
        un document comptable ou fiscal.
      </p>
    ),
  },
  {
    id: "discord",
    title: "Annonces Discord",
    body: (
      <p>
        Si vous configurez un webhook Discord, les liens de vos publications sont envoyés dans le salon correspondant, avec le message et les
        mentions (par exemple @everyone) que vous avez choisis. Vous êtes responsable des webhooks que vous ajoutez, de l&apos;autorisation
        d&apos;utiliser le serveur Discord concerné et des messages qui y sont publiés.
      </p>
    ),
  },
  {
    id: "interdits",
    title: "Utilisations interdites",
    body: (
      <>
        <p>Il est interdit notamment :</p>
        <ul>
          <li>de publier des contenus illicites, trompeurs, haineux ou portant atteinte aux droits d&apos;autrui ;</li>
          <li>d&apos;envoyer du spam ou de contourner les limites, quotas ou règles des plateformes ;</li>
          <li>d&apos;accéder ou de tenter d&apos;accéder à l&apos;espace d&apos;un autre utilisateur, au serveur ou aux données d&apos;autrui ;</li>
          <li>de perturber le fonctionnement du service ou de l&apos;utiliser pour le compte de tiers sans leur accord.</li>
        </ul>
      </>
    ),
  },
  {
    id: "disponibilite",
    title: "Disponibilité et évolution",
    body: (
      <p>
        L&apos;Éditeur s&apos;efforce de maintenir le service accessible mais ne garantit pas une disponibilité permanente : maintenance, panne de
        l&apos;hébergeur ou modification des API par les plateformes peuvent interrompre ou modifier certaines fonctionnalités. Le service peut évoluer,
        être limité ou arrêté ; en cas d&apos;arrêt, l&apos;Éditeur s&apos;efforcera de vous prévenir dans un délai raisonnable.
      </p>
    ),
  },
  {
    id: "responsabilite",
    title: "Responsabilité",
    body: (
      <>
        <p>
          Le service est fourni en l&apos;état. Dans les limites permises par la loi, l&apos;Éditeur n&apos;est pas responsable des décisions prises par les
          plateformes (refus, retrait, limitation de portée, suspension de compte), des contenus publiés par les utilisateurs, ni des dommages
          indirects tels qu&apos;une perte d&apos;audience ou de revenus.
        </p>
        <p>
          Conservez une copie de vos fichiers originaux : le service n&apos;est pas un outil de sauvegarde. Rien dans les Conditions ne limite les droits
          que la loi accorde aux consommateurs.
        </p>
      </>
    ),
  },
  {
    id: "resiliation",
    title: "Suspension et fin d'utilisation",
    body: (
      <p>
        Vous pouvez cesser d&apos;utiliser le service à tout moment : déconnectez vos comptes depuis la page « Comptes » et demandez la suppression de
        votre espace à <Contact /> (voir la <Link href={`${privacy}#${DATA_DELETION_ANCHOR}`}>suppression des données</Link>). L&apos;Éditeur peut suspendre ou
        supprimer un accès en cas de manquement aux Conditions, de risque pour la sécurité ou à la demande d&apos;une autorité.
      </p>
    ),
  },
  {
    id: "donnees",
    title: "Données personnelles",
    body: (
      <p>
        Le traitement de vos données personnelles est décrit dans la <Link href={privacy}>politique de confidentialité</Link>, qui fait partie
        intégrante des Conditions.
      </p>
    ),
  },
  {
    id: "propriete",
    title: "Propriété intellectuelle",
    body: (
      <p>
        Le service, son interface et ses éléments graphiques sont protégés. Vous bénéficiez d&apos;un droit d&apos;utilisation personnel, non exclusif
        et non transférable, pour la durée de votre accès. Vos contenus restent votre propriété (voir « Vos contenus »).
      </p>
    ),
  },
  {
    id: "modifications",
    title: "Modification des Conditions",
    body: (
      <p>
        Les Conditions peuvent être mises à jour, notamment pour suivre l&apos;évolution du service ou des règles des plateformes. La date de mise à
        jour figure en haut de cette page ; en cas de changement important, vous en serez informé dans le service. Continuer à utiliser le service
        après une mise à jour vaut acceptation de la nouvelle version.
      </p>
    ),
  },
  {
    id: "droit",
    title: "Droit applicable et litiges",
    body: (
      <p>
        Les Conditions sont soumises au droit français. En cas de difficulté, contactez d&apos;abord <Contact /> afin de rechercher une solution
        amiable. À défaut, le litige sera porté devant les tribunaux compétents ; si vous êtes consommateur, vous pouvez saisir la juridiction de
        votre lieu de résidence.
      </p>
    ),
  },
];

export function TermsOfService() {
  return (
    <LegalPage
      current="terms"
      intro={
        <p>
          Ces conditions expliquent ce que <Service /> vous permet de faire, ce que nous attendons de vous et les règles qui s&apos;appliquent
          lorsque vous publiez sur TikTok, YouTube et Instagram depuis le service.
        </p>
      }
      highlights={[
        { icon: <FileCheck2 />, title: "Vos contenus restent à vous", text: "Ils servent uniquement à être publiés là où vous le décidez." },
        { icon: <Scale />, title: "Les règles des plateformes s'appliquent", text: "TikTok, YouTube, Instagram, Twitch et Discord gardent leurs propres conditions." },
        { icon: <Hand />, title: "Rien sans votre accord", text: "Aucune publication n'est faite sans une action de votre part." },
      ]}
      sections={sections}
    />
  );
}
