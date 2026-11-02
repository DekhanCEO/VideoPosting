# Uplink — vidéos de présentation (Remotion)

Neuf compositions verticales (1080×1920, 30 i/s) autour de l'interface réelle d'Uplink :

| Composition | Durée | Contenu |
| --- | --- | --- |
| `Launch` | 5 s | Plan de lancement : le téléphone arrive incliné et pivote en trois quarts, l'écran d'accueil se construit, trois cartes flottantes, plan fixe final. |
| `Tour` | 64 s | Visite guidée de toutes les options, avec l'utilisateur « Dekhan » : 14 chapitres titrés, un écran de l'application par chapitre, une carte flottante par option. |
| `UplinkPub` | 15 s | Publicité premium sombre (accroche, révélation, produit, détail, appel à l'action), avec bruitages. |
| `TikTok` | 15 s | Version courte pour TikTok, Reels et Shorts : « Signal » (oscilloscope) puis « Publier » (plan-séquence façon keynote). |
| `TikTokEssentiel` | 15 s | Version précédente : accroche, quatre messages, un plan par message. |
| `TikTokElan` | 15 s | « Élan » : version motion design (skill LottieFiles), violet Uplink, volets chevron, bande-son synthétisée. |
| `TikTokPremiere` | 25 s | « Première » : film style Apple × Netflix (mur d'affiches, générique en rubans, épisodes), bande-son synthétisée. |

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

## La publicité premium (`UplinkPub`)

15 s, ambiance sombre premium (#0B0B0F, texte #F5F5F7 / #8E8E93, accent violet d'Uplink #9B6BFF), Geist Sans 600 pour
les titres (-2 %), Inter pour le corps. Un message par plan, au moins 40 % d'espace vide, jamais plus de 6 mots à
l'écran, aucun texte sous 36 px, marges de 80 px en haut et en bas. Entrées en ease-out cubique, éléments produit en
ressort (damping 20, stiffness 120), animations qui se chevauchent, lumière diagonale (blanc 8 %) aux transitions
majeures, et passage d'un plan à l'autre par morphing.

| Plan | Temps | Contenu | Morphing vers le plan suivant |
| --- | --- | --- | --- |
| 1 Accroche | 0–2,5 s | « Trois apps. Trois uploads. Épuisant. » mot par mot (fondu + 8 px, toutes les 6 images) ; « Épuisant. » est remplacé par « Fini. » à l'accent. | « Fini. » devient le logo. |
| 2 Révélation | 2,5–5 s | Logo, « Uplink » en grand (ressort 0,85 → 1), « Une vidéo. Tous tes réseaux. » ; lumière diagonale. | Le logo devient l'écran du téléphone. |
| 3 Produit | 5–10 s | Téléphone sobre qui pivote à 12° puis se redresse ; écran A « Un envoi. Partout. » (une vidéo reliée à TikTok, YouTube, Instagram), B « Programmé à l'heure. » (19:00), C « Communauté prévenue. » (notification Discord). | Bouton → carte horaire → notification → carte de résultat. |
| 4 Détail | 10–13 s | Zoom lent 1 → 1,15 sur la publication : les trois barres se remplissent, « 0/3 » → « 3/3 en ligne » ; le zoom se fige et le fond s'assombrit sur la dernière demi-seconde. | La carte devient le bouton. |
| 5 Appel à l'action | 13–15 s | Logo en petit en haut (lumière diagonale), « Publie partout. », bouton « Essayer maintenant », « dsociety.fr/uplink » ; fondu au noir sur les 10 dernières images. | — |

Uplink est une application web (dsociety.fr/uplink), pas une application des stores : pas de badge App Store ou Google
Play, pas de chiffre d'usage inventé (le seul chiffre affiché, 3/3, est le nombre de plateformes publiées).
Bruitages synthétisés (`npm run sfx:pub` → `public/pub/sfx/`) : souffle à chaque morphing, clic à l'apparition du logo,
carillon au bouton. Pas de musique intégrée : en ajouter une sous licence au montage final si besoin.

```
src/pub/
├── timing.ts                 toutes les constantes de temps (images)
├── layout.ts                 géométrie partagée par les morphings
├── theme.ts                  couleurs et polices
├── fonts.ts                  chargement de Geist Sans et Inter
├── UplinkPub.tsx             la composition (fond, plans, lumière, fondu au noir, bruitages)
├── components/               anim.ts, Background, LightSweep, UplinkMark, PhoneFrame
└── scenes/
    ├── 01-accroche/Accroche.tsx
    ├── 02-revelation/Revelation.tsx
    ├── 03-produit/Produit.tsx, EcranPublier.tsx, EcranProgrammer.tsx, EcranDiscord.tsx
    ├── 04-detail/Detail.tsx
    └── 05-cta/Cta.tsx
```

```bash
npx remotion studio                                  # prévisualisation
npx remotion render UplinkPub out/uplink-pub.mp4     # rendu (ou npm run render:pub)
```

À vérifier à l'œil après rendu : chaque titre lisible le temps de le lire (accroche ~1 s après le dernier mot, légendes
~1 s) ; aucun chevauchement de textes pendant les morphings ; rien dans les 80 px du haut et du bas ; le compteur passe
bien 0/3 → 3/3 au rythme des barres ; la lumière diagonale reste discrète ; le zoom du plan 4 se fige net ; dernière image
entièrement noire ; bruitages au bon moment et à un volume discret.

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

## La version « Élan » (`TikTokElan`)

Construite en appliquant le skill [motion-design de LottieFiles](https://github.com/LottieFiles/motion-design-skill)
(intention émotionnelle, récit, savoir-faire). L'identité de mouvement est définie une fois dans `src/elan/kit.tsx` :

- **Personnalité** : énergique à ~90 % (ease-out-expo, ressorts à ~20 %, éclats de particules, écrasement/étirement à
  l'impact), premium pour la résolution (courbe douce, sans dépassement, 400–800 ms, respiration).
- **Courbe signature** `cubic-bezier(0.16, 1, 0.3, 1)` pour les entrées, sorties en accélération à ~70 % de la durée
  d'entrée, déplacements à l'écran en ease-in-out ; **durées** 4 / 6 / 9 images (+ 20 pour la révélation).
- **Entrée unique** : tout monte depuis le bas (texte sorti d'un masque, objets qui montent et grossissent) ;
  **transition** de marque : le volet chevron « ^ » à trois bandes.
- **Trois couches** partout : primaire (le héros), secondaire (2–3 images plus tard : libellés, lueurs, ondes,
  particules), ambiante (aurore violette, grille en contre-mouvement, poussières, flottement du téléphone).
- Décalages sous 500 ms, un seul héros par temps fort (le téléphone recule et s'assombrit quand les cartes arrivent),
  aucune trajectoire de plus d'un tiers d'écran sans étape intermédiaire.

| Temps | Acte | Texte | Image |
| --- | --- | --- | --- |
| 0–2,1 s | Anticipation → impact | « 1 vidéo. » → « 3 réseaux. » → « 1 clic. » | Chiffre géant en odomètre, les trois logos jaillissent du « 3 » puis sont aspirés ; on tape sur le « 1 » : compression, onde, éclat, il décolle. Volet chevron. |
| 2,1–4,9 s | Action | « Publie partout. » « TikTok, YouTube, Instagram. » | Le téléphone monte avec le volet ; bouton « Publier partout » pressé ; trois cartes « Publiée » sortent de l'écran (motif de succès : conteneur, coche tracée, couleur, lueur). |
| 4,9–7,2 s | Action | « Programme. » « Uplink publie à ta place. » | « 19:00 » en odomètre au-dessus du calendrier. |
| 7,2–9,6 s | Action | « Ta commu prévenue. » « Les liens partent sur Discord. » | Le message Discord sort de l'écran et vient vers nous, onde de notification. |
| 9,6–11,3 s | Réaction | « Tes stats. Tes revenus. » | Ondes depuis le téléphone, courbe « Abonnés » qui se trace, barres « Revenus » qui montent (sans chiffres inventés). |
| 11,3–15 s | Résolution | « Uplink » « Publie partout. Pilote tout. » | Volet violet ; le chevron pivote et devient le bouton lecture du logo ; nom, promesse, adresse dsociety.fr/uplink ; une seconde de calme. |

La bande-son (150 BPM, calée sur les temps forts) est synthétisée par `scripts/elan-audio.py` puis encodée dans
`public/elan/elan.m4a` : `npm run audio:elan`. Rendu : `npm run render:elan`.

## Le film « Première » (`TikTokPremiere`)

25 s dans un style **Apple × Netflix** : noir cinéma, spectre violet → corail, typographie keynote, téléphone en
studio, interface de plateforme de streaming (mur d'affiches, fiche aperçu, liste d'épisodes, barre de lecture,
« Suivant », Top 3). Inspiration de style uniquement : ni logo, ni nom, ni son de marque tiers.

Identité de mouvement (skill motion-design de LottieFiles, `src/premiere/parts.tsx`) : personnalité premium à ~90 %
(décélérations longues, aucun dépassement, temps de pause), énergie empruntée à trois moments (le mur qui défile,
l'impact du générique, le clic) ; courbe signature `cubic-bezier(0.22, 1, 0.36, 1)` ; durées 11 / 15 / 24 / 36
images ; une seule entrée (monter, passer de 98 à 100 %, sortir d'un léger flou).

| Temps | Séquence | Image |
| --- | --- | --- |
| 0–2,2 s | Le mur | Des dizaines d'affiches défilent en perspective, puis ralentissent ; « Publie une fois. Diffuse partout. » |
| 2,2–5 s | L'aperçu | Une affiche sort du mur, se tourne vers nous et devient une fiche (titre, formats, TikTok / YouTube / Instagram) ; appui sur « ▶ Publier partout », la publication se remplit, les trois réseaux sont cochés. |
| 5–8,5 s | Le générique | La fiche s'éteint en un trait de lumière ; des rubans en jaillissent et dessinent le logo ; compression, impact, « Uplink », « Une création dsociety » ; plongeon dans le triangle du bouton lecture. |
| 8,5–10 s | Les épisodes | Liste des quatre épisodes ; la vignette du premier s'agrandit jusqu'au plein écran. |
| 10–22 s | Épisodes 1 à 4 | « Publie partout. » (bandeaux de notification), « Programme. » (« 19:00 » d'écran verrouillé), « Ta commu prévenue. » (message Discord), « Tes stats. Tes revenus. » (Top 3 de tes vidéos, courbe des revenus). |
| 22–25 s | Fin | Logo, « Uplink », « Publie partout. Pilote tout. », « ▶ dsociety.fr/uplink », « Une création dsociety ». |

Bande-son : `npm run audio:premiere` (synthèse, `scripts/premiere-audio.py`) ; rendu : `npm run render:premiere`.

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
npm run render:elan                 # out/uplink-elan.mp4 (version motion design, avec bande-son)
npm run render:premiere             # out/uplink-premiere.mp4 (film Apple × Netflix, 25 s, avec bande-son)
npm run render:tour -- --browser-executable=/chemin/vers/chrome-headless-shell   # si Chrome ne peut pas être téléchargé
```

Rendu : H.264, CRF 14, yuv420p, images intermédiaires PNG (voir `remotion.config.ts`).
