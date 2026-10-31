# Uplink — vidéos de présentation (Remotion)

Trois compositions verticales (1080×1920, 30 i/s), même téléphone en 3D CSS, même interface réelle d'Uplink :

| Composition | Durée | Contenu |
| --- | --- | --- |
| `Launch` | 5 s | Plan de lancement : le téléphone arrive incliné et pivote en trois quarts, l'écran d'accueil se construit, trois cartes flottantes, plan fixe final. |
| `Tour` | 64 s | Visite guidée de toutes les options, avec l'utilisateur « Dekhan » : 14 chapitres titrés, un écran de l'application par chapitre, une carte flottante par option. |
| `TikTok` | 15 s | Version courte pour TikTok, Reels et Shorts : accroche dès la première image, les 12 options en rafale, appel à l'action. |

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

15 s, montage nerveux : un cadrage différent par option, enchaînés par des filés (avec flou de bougé), des coups de
zoom et des flashs, et des changements de fond (clair, violet, lilas, bleu Discord, nuit).

| Temps | Plan |
| --- | --- |
| 0–2,6 s | **Accroche** sur fond sombre : « Arrête de publier **3 fois** la même vidéo. » (déjà en mouvement à l'image 0), logos qui claquent, « 3 » barré qui bascule sur « 1 » : « Publie-la **1 fois** partout. » Les logos fusionnent dans le logo Uplink, qui s'ouvre en volet. |
| 01 Comptes | Le téléphone sort du volet en tournoyant ; TikTok, YouTube, Instagram et Twitch se connectent autour. |
| 02 Créer | Fond violet : le téléphone **se dédouble en trois**, un par plateforme. |
| 03 Réglages | **Gros plan** sur le choix du format YouTube (Auto → Short). |
| 04 Photos | **Vue de dessus**, téléphone posé à plat qui tourne, ombre sur la table. |
| 05 Programmer | **« 19:00 » géant** au-dessus d'un téléphone incliné. |
| 06 Publier | **Travelling avant** sur le suivi en direct : échec Instagram, relance, réussite et gerbe de particules. |
| 07 Discord | Fond bleu Discord, **contre-plongée** : le message d'annonce sort de l'écran et vient vers nous. |
| 08 Statistiques | Fond nuit : l'**interface plein cadre** en thème sombre, inclinée. |
| 09 Influence | **Anneau géant** qui se remplit jusqu'à 12,8 %, formule autour. |
| 10 Audience | **Orbite** autour du téléphone, les pays sortent de l'écran. |
| 11 Revenus | Fond violet : **4 918,98 € géant** qui compte, sources qui arrivent une à une, « Objectif atteint ». |
| 12 Accès | Le téléphone **fait un tour complet** et se pose sur l'administration. |
| 12,8–15 s | **Fin** : le cadre recule, l'appli passe en sombre, trois cartes, « Publie partout. Pilote tout. », www.dsociety.fr/uplink. |

Les textes restent hors des zones couvertes par l'interface de TikTok (onglets en haut, boutons à droite, légende en
bas). Les plans et leurs transitions : `SHOTS` dans `src/tiktok/TikTok.tsx` ; les cadrages : `src/tiktok/shots.tsx`.

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
npm run render:tour -- --browser-executable=/chemin/vers/chrome-headless-shell   # si Chrome ne peut pas être téléchargé
```

Rendu : H.264, CRF 14, yuv420p, images intermédiaires PNG (voir `remotion.config.ts`).
