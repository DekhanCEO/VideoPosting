# VideoPosting

Studio de publication vidéo multi-plateforme : importez **une vidéo**, adaptez le titre, la description et les réglages
pour **TikTok**, **YouTube** et **Instagram**, puis publiez partout en un clic (ou programmez la publication).
Un tableau de bord suit ensuite vos **statistiques** (abonnés, vues, engagement, meilleures vidéos) et vos **revenus**.

> Sans aucune clé d'API, l'application démarre en **mode démo** : comptes fictifs, publications simulées,
> statistiques et revenus d'exemple. Idéal pour découvrir l'outil avant de configurer les plateformes.

## Fonctionnalités

**Publication**
- Envoi de vidéos volumineuses par morceaux (reprise automatique en cas de coupure), glisser-déposer.
- Contenu commun (titre, description, hashtags) repris automatiquement par chaque plateforme, avec personnalisation
  champ par champ (« Synchronisé » / « Personnalisé »).
- Réglages complets par plateforme :
  - **YouTube** : titre, description, tags, miniature (automatique, image extraite de la vidéo ou import), visibilité,
    catégorie, langue, audience enfants (COPPA), notification des abonnés, intégration, contenu synthétique (IA),
    licence. Détection automatique des **Shorts**.
  - **TikTok** : publication directe ou envoi en brouillon, légende, confidentialité (options réelles du compte, sans
    présélection comme l'exige TikTok), commentaires / duo / collage, image de couverture, divulgation de contenu
    commercial (votre marque / contenu de marque), étiquette IA, durée max du compte.
  - **Instagram** : légende (compteurs de hashtags et mentions), partage dans le fil, couverture, collaborateurs,
    nom de l'audio, lieu.
- **Aperçus réalistes** dans un téléphone (TikTok, Reel, Short ou page vidéo YouTube) mis à jour en direct.
- Vérifications avant publication (limites de caractères, formats, durées, comptes connectés…).
- Programmation (raccourcis « Ce soir 19:00 », « Demain 12:00 »…), calendrier mensuel, brouillons, duplication.
- Suivi en direct de chaque envoi (progression, étapes, journal), annulation, relance des échecs.

**Statistiques**
- Abonnés par plateforme et évolution, vues par jour / semaine, interactions et taux d'engagement.
- Classement des meilleures vidéos publiées avec VideoPosting (vues par plateforme).
- Synchronisation automatique toutes les 6 heures (ou à la demande), vue tableau pour chaque graphique.

**Revenus**
- Revenus et dépenses par source : partenariats, revenus publicitaires, programmes créateurs (TikTok Creator Rewards…),
  affiliation, boutique, abonnements, dons.
- **Revenus publicitaires YouTube importés automatiquement** (YouTube Analytics, chaînes monétisées).
- Objectif mensuel, bénéfice net, paiements en attente, répartition par source et par plateforme, export CSV (Excel).

**Autres** : thème clair / sombre, interface responsive (mobile), protection par mot de passe, groupes de hashtags,
valeurs par défaut.

## Démarrage

Prérequis : **Node.js 20+** (22 recommandé). `ffmpeg`/`ffprobe` sont facultatifs mais conseillés (ils permettent
d'analyser les vidéos que le navigateur ne sait pas lire, par exemple le HEVC des iPhone).

```bash
npm install
npm run dev          # http://localhost:3000
```

En production :

```bash
npm run build
npm start            # garder le processus actif : il publie les vidéos programmées
```

Les données (base JSON, vidéos, jetons d'accès) sont stockées dans `data/` (modifiable via `DATA_DIR`).
Pensez à sauvegarder ce dossier et à ne jamais le partager.

## Configuration des plateformes

1. Copiez `.env.example` en `.env` (ou saisissez les identifiants dans **Paramètres**).
2. Les plateformes exigent une **URL HTTPS publique** pour les redirections OAuth (TikTok, Instagram) : déployez
   l'application ou utilisez un tunnel (`cloudflared tunnel --url http://localhost:3000`, `ngrok http 3000`) et
   renseignez `PUBLIC_URL`.
3. Déclarez l'URI de redirection affichée dans **Paramètres** (`<PUBLIC_URL>/api/auth/<plateforme>/callback`).
4. Désactivez le mode démo, puis connectez vos comptes dans **Comptes**.

Chaque carte de la page Paramètres contient un guide pas à pas. En résumé :

| Plateforme | Console | À activer | Points d'attention |
|---|---|---|---|
| YouTube | [Google Cloud Console](https://console.cloud.google.com/) | YouTube Data API v3, YouTube Analytics API, ID client OAuth « Application Web » | Projet non audité : vidéos envoyées en privé. Quota par défaut 10 000 unités/jour (un envoi ≈ 1 600). |
| TikTok | [TikTok for Developers](https://developers.tiktok.com/apps) | Login Kit, Content Posting API (Direct Post), scopes `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.publish`, `video.upload` | Avant l'audit TikTok, publication directe uniquement en « Moi uniquement ». |
| Instagram | [Meta for Developers](https://developers.facebook.com/apps) | Produit Instagram (connexion Instagram) **ou** Facebook Login for Business | Compte professionnel requis. Connexion Instagram : Instagram télécharge la vidéo depuis `PUBLIC_URL`. Via Facebook : envoi direct, Page Facebook liée nécessaire. 100 publications / 24 h. |

### Revenus
Seul YouTube expose les revenus via API (`estimatedRevenue`, chaînes du Programme Partenaire). TikTok et Instagram
ne fournissent pas leurs gains : ajoutez-les (ainsi que vos partenariats, affiliations, etc.) dans la page **Revenus**.

## Architecture

- **Next.js 16** (App Router) + React 19 + TypeScript + Tailwind CSS 4, sans base de données externe.
- `src/lib/server/platforms/` : un adaptateur par plateforme (OAuth, renouvellement des jetons, envoi, statistiques)
  - YouTube : envoi « resumable » par morceaux de 8 Mio, miniature, YouTube Analytics.
  - TikTok : `creator_info`, initialisation, envoi par morceaux (5–64 Mo), suivi du statut.
  - Instagram : conteneur Reel, envoi resumable (Facebook Login) ou URL signée temporaire (connexion Instagram),
    suivi du traitement puis publication.
- `src/lib/server/publisher.ts` : publication en parallèle sur chaque plateforme, progression enregistrée, annulation.
- `src/lib/server/scheduler.ts` : démarré au lancement du serveur (`instrumentation.ts`), publie les posts programmés,
  renouvelle les jetons et synchronise les statistiques.
- `src/lib/validation.ts` : règles partagées entre l'interface et le serveur.
- Déclencheur externe facultatif : `GET /api/cron?secret=<CRON_SECRET>&sync=1`.

## Tests

```bash
npm test            # règles de validation, légendes, découpage TikTok, sessions
npm run typecheck
```

Astuce mode démo : ajoutez `#echec` dans un texte pour simuler une erreur de publication et tester la relance.
