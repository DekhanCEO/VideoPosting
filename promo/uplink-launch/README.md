# Uplink — vidéos de présentation (Remotion)

Cinq compositions verticales (1080×1920, 30 i/s) autour de l'interface réelle d'Uplink :

| Composition | Durée | Contenu |
| --- | --- | --- |
| `Launch` | 5 s | Plan de lancement : le téléphone arrive incliné et pivote en trois quarts, l'écran d'accueil se construit, trois cartes flottantes, plan fixe final. |
| `Tour` | 64 s | Visite guidée de toutes les options, avec l'utilisateur « Dekhan » : 14 chapitres titrés, un écran de l'application par chapitre, une carte flottante par option. |
| `TikTok` | 15 s | Version courte pour TikTok, Reels et Shorts : « Signal » (oscilloscope) puis « Publier » (plan-séquence façon keynote). |
| `TikTokEssentiel` | 15 s | Version précédente : accroche, quatre messages, un plan par message. |

## Les 14 chapitres de la visite (`Tour`)

1. **Accueil** : tableau de bord (audience, courbe, dernières publications), connexion Twitch.
2. **Comptes** : TikTok, YouTube, Instagram et chaîne Twitch connectés, statistiques Twitch.
3. **Créer** : une vidéo importée une fois, trois plateformes, légende et hashtags.
4. **Réglages** : visibilité TikTok, Short ou vidéo longue YouTube, Reel ou publication Instagram.
5. **Photos** : carrousels Instagram (10 photos) et diaporamas TikTok (35), ordre modifiable.
6. **Programmer** : créneaux rapides, calendrier, publication automatique à l'heure.
7. **Publier** : suivi en direct par plateforme, relance en un clic en cas d'échec.
8. **Discord** : webhooks, annonce automatique avec les liens dans les salons.
9. **Statistiques** : abonnés, vues, interactions, meilleures vidéos.
10. **Influence** : taux d'influence (actions engagées pour 100 vues), par plateforme.
11. **Audience** : genre, âge, pays.
12. **Revenus** : partenariats, publicité YouTube, estimations TikTok, Instagram et Twitch, objectif.
13. **Accès** : mode d'accès sur invitation, espaces des créateurs, réglages réservés à l'administrateur.
14. **Confort** : bascule du thème clair au thème sombre.

Ouverture (logo, « Bienvenue, Dekhan ») et fin (« Publiez partout. Pilotez tout. », www.dsociety.fr/uplink), dernière
seconde en plan fixe. Pas de voix ni de musique : les titres portent l'explication.

## La version TikTok (`TikTok`)

Le contenu « essentiel » (une accroche, quatre messages courts, la fin) tourné en **un seul plan-séquence façon
keynote** : fond clair #EEEEEC, encre presque noire, un seul point rouge, Inter Tight. Aucune coupe, aucun fondu :
chaque état naît du précédent, ressorts à ~10 % de dépassement, flou de bougé proportionnel à la vitesse, ombres
douces en couches, une seconde immobile à la fin.

| Temps | Texte | Ce qui se transforme |
| --- | --- | --- |
| 0–2,9 s | « Arrête de publier **3 fois** la même vidéo. » → « Publie-la **1 fois** partout. » | Le 3 est barré et bascule sur 1 ; les logos TikTok, YouTube, Instagram fusionnent en **point rouge**. |
| 2,9–5,7 s | « 1 clic. » « 3 plateformes. » | Le point fait pousser le bouton « Publier », un pointeur le presse ; le bouton s'ouvre en carte qui **se divise en trois** (Publiée ✓). |
| 5,7–7,9 s | « Programme. » « Uplink publie à ta place. » | Les trois cartes se rassemblent, prennent un cadre : un **téléphone** (l'application de Dekhan) ; « 19:00 » sort de l'écran et devient **géant**. |
| 7,9–10,2 s | « Ta commu prévenue. » « Les liens partent sur Discord. » | Le 19:00 rentre ; le **message Discord sort du téléphone**. |
| 10,2–12 s | « Tes stats. Tes revenus. » | Le message **se divise en trois chiffres** : +5 990 abonnés, 12,8 %, 4 918,98 €. |
| 12–15 s | « Publie partout. » « Pilote tout. » | Les chiffres rentrent dans le téléphone, la caméra recule, le téléphone devient le **« o » de « partout »** et le point rouge vient se poser en **point final** ; « Uplink · www.dsociety.fr/uplink ». |

Textes hors des zones couvertes par l'interface de TikTok. Chronologie et géométrie : `T`, `dev()`, `slices()`,
`redDot()` dans `src/tiktok/OneTake.tsx` ; outils communs (ressorts, flou, ombres) dans `src/tiktok/motionKit.tsx`.

Variantes : `npm run render:tiktok-signal` (oscilloscope puis keynote, `src/tiktok/Scope.tsx` + `Keynote.tsx`) et
`npm run render:tiktok-essentiel` (un plan par message, `src/tiktok/Essentiel.tsx`).

## Personnaliser

- Plan de lancement : `src/config.ts` (nom, accent, chiffre principal, courbe, lignes, cartes, rythme en images).
- Visite : `src/tour/Tour.tsx` (`USER` pour le nom affiché, `SCENES` pour l'ordre, la durée, les titres, les cartes et
  l'angle du téléphone de chaque chapitre). Les écrans sont dans `src/tour/screens1.tsx` et `src/tour/screens2.tsx`.
- Thèmes clair et sombre : `src/theme.tsx`.

## Rendre

```bash
npm install
npm run studio                      # aperçu interactif
npm run render                      # out/uplink-launch.mp4
npm run render:tour                 # out/uplink-tour.mp4
npm run render:tiktok               # out/uplink-tiktok.mp4
npm run render:tiktok-signal        # out/uplink-tiktok-signal.mp4 (variante oscilloscope)
npm run render:tiktok-essentiel     # out/uplink-tiktok-essentiel.mp4 (variante un plan par message)
npm run render:tour -- --browser-executable=/chemin/vers/chrome-headless-shell   # si Chrome ne peut pas être téléchargé
```

Rendu : H.264, CRF 14, yuv420p, images intermédiaires PNG (voir `remotion.config.ts`).
