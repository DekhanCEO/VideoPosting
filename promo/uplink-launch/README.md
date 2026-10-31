# Uplink — vidéos de présentation (Remotion)

Quatre compositions verticales (1080×1920, 30 i/s) autour de l'interface réelle d'Uplink :

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

15 s en deux actes, un seul fil : le signal de ta vidéo devient la publication.

**Acte 1 — Signal (0–3,6 s), oscilloscope.** Écran vert-noir, graticule qui s'efface vers les bords, aucun cadre.
Une seule trace de phosphore (cœur presque blanc, halo vert, courte rémanence des images précédentes), continue du
début à la fin : sinusoïde qui défile puis se verrouille, se replie en figure de Lissajous 3:2 qui tourne lentement,
se relâche en onde qui s'amortit jusqu'à une ligne plate, d'où montent de gauche à droite les capitales fines
« UPLINK », posées sur la trace, chacune avec un léger dépassement. L'accroche « ARRÊTE DE POSTER / 3 FOIS / LA MÊME
VIDÉO. » est lisible dès l'image 0. Un petit afficheur d'instrument (CH1 · …), pas d'inscription dans les coins, le
cinquième inférieur vide. Extinction cathodique : l'image s'écrase en ligne, puis en point.

**Acte 2 — Publier (3,6–15 s), plan-séquence keynote.** Fond #EEEEEC, encre presque noire, un seul point rouge, Inter
Tight ; aucune coupe, aucun fondu. Le point de l'oscilloscope devient rouge et le fond clair s'ouvre autour de lui. Le
point fait pousser un bouton noir « Publier », un pointeur le presse (« 1 clic. ») ; le bouton s'ouvre en carte
blanche « En ligne partout » — TikTok, YouTube, Instagram publiés (« 3 plateformes. ») ; la carte se dote d'un cadre
et devient un téléphone avec l'application de Dekhan (« Programme. » 19:00, « Ta commu prévenue. » Discord, « Tes
stats. Tes revenus. » +5 990 abonnés, 4 918 €). La caméra recule : le contour du téléphone se referme en « o » de
« Publie partout. » et le point rouge vient se poser en point final. Signature « Uplink · www.dsociety.fr/uplink »,
dernière seconde immobile.

Chaque état naît du précédent : ressorts à ~10 % de dépassement (la forme du « o » sans dépassement, la caméra en
zoom logarithmique), flou de bougé proportionnel à la vitesse (bouton, carte, pointeur, point rouge, recul), ombres
douces en couches. Textes hors des zones couvertes par l'interface de TikTok.

Fichiers : `src/tiktok/Scope.tsx` (acte 1), `src/tiktok/Keynote.tsx` (acte 2, chronologie `K`),
`src/tiktok/TikTok.tsx` (assemblage). La version précédente reste disponible : `npm run render:tiktok-essentiel`.

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
npm run render:tiktok-essentiel     # out/uplink-tiktok-essentiel.mp4 (version précédente)
npm run render:tour -- --browser-executable=/chemin/vers/chrome-headless-shell   # si Chrome ne peut pas être téléchargé
```

Rendu : H.264, CRF 14, yuv420p, images intermédiaires PNG (voir `remotion.config.ts`).
