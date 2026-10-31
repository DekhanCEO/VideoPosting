# Uplink — vidéos de présentation (Remotion)

Six compositions verticales (1080×1920, 30 i/s) autour de l'interface réelle d'Uplink :

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

Le scénario de la version « essentiel » — mêmes plans, mêmes cadrages, même rythme — dans la **direction artistique
keynote** : fond clair #EEEEEC, encre presque noire, Inter Tight (titres et écrans du téléphone), un seul point rouge
par image (né des trois logos, puis point final de chaque titre), ombres douces en couches, ressorts à ~10 % de
dépassement, flou de bougé proportionnel à la vitesse (téléphones, cartes, logos), transitions par mouvement (zoom,
filé) sans fondu ni flash, une seconde immobile à la fin.

| Temps | Texte | Image |
| --- | --- | --- |
| 0–2,8 s | « Arrête de publier **3 fois** la même vidéo. » → « Publie-la **1 fois** partout. » | Le 3 est barré et bascule sur 1 ; les logos TikTok, YouTube, Instagram (vignettes d'encre) fusionnent en point rouge, la caméra plonge dedans. |
| 2,8–5,4 s | « 1 clic. 3 plateformes. » | Le téléphone arrive en tournoyant et se dédouble en trois, un logo sous chacun. |
| 5,4–7,8 s | « Programme. » « Uplink publie à ta place. » | « 19:00 » géant au-dessus du calendrier, téléphone incliné. |
| 7,8–10,2 s | « Ta commu prévenue. » « Les liens partent sur Discord. » | Contre-plongée ; le message Discord (carte blanche) sort de l'écran et vient vers nous. |
| 10,2–12,6 s | « Tes stats. Tes revenus. » | Trois cartes : +5 990 abonnés, 12,8 % d'influence, 4 918,98 € ce mois. |
| 12,6–15 s | « Uplink — Publie partout. Pilote tout. » | Adresse www.dsociety.fr/uplink ; le cadre recule, l'application passe en thème sombre. |

Les écrans de l'application reprennent la direction artistique grâce aux thèmes `KEYNOTE_LIGHT` / `KEYNOTE_DARK`
(`src/theme.tsx` : couleurs, police, largeur des chiffres). Plans et rythme : `SHOTS` dans
`src/tiktok/NouvelleDA.tsx` ; outils communs (ressorts, flou, ombres) dans `src/tiktok/motionKit.tsx`.

Le prompt complet pour reproduire cette vidéo est dans `prompts/tiktok-keynote.md`.

Variantes : `npm run render:tiktok-plan-sequence` (un seul plan, `src/tiktok/OneTake.tsx`),
`npm run render:tiktok-signal` (oscilloscope puis keynote) et `npm run render:tiktok-essentiel` (direction violette).

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
npm run render:tiktok-plan-sequence # out/uplink-tiktok-plan-sequence.mp4 (variante plan-séquence)
npm run render:tiktok-signal        # out/uplink-tiktok-signal.mp4 (variante oscilloscope)
npm run render:tiktok-essentiel     # out/uplink-tiktok-essentiel.mp4 (variante direction violette)
npm run render:tour -- --browser-executable=/chemin/vers/chrome-headless-shell   # si Chrome ne peut pas être téléchargé
```

Rendu : H.264, CRF 14, yuv420p, images intermédiaires PNG (voir `remotion.config.ts`).
