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

- **0–2,8 s, accroche** sur fond sombre : « Arrête de publier **3 fois** la même vidéo. » (déjà en mouvement à
  l'image 0). Les logos TikTok, YouTube et Instagram claquent, « 3 » est barré puis bascule sur « 1 » : « Publie-la
  **1 fois** partout. » Les trois logos fusionnent dans le logo Uplink, qui s'ouvre en volet sur le téléphone.
- **2,8–12,4 s, les 12 options**, 0,8 s chacune (compteur « 03/12 ») : comptes, création multi-plateforme,
  réglages Short/Reel, photos, programmation, suivi en direct, Discord, statistiques, influence, audience, revenus,
  accès. Les écrans de l'application sont accélérés pour montrer l'action complète dans le temps imparti, avec un
  léger coup de zoom à chaque changement.
- **12,4–15 s, fin** : « Uplink — Publie partout. Pilote tout. », www.dsociety.fr/uplink, le téléphone passe en thème
  sombre et les trois cartes flottantes apparaissent.

Les textes restent hors des zones couvertes par l'interface de TikTok (onglets en haut, boutons à droite, légende en
bas). Tutoiement, rythme calé sur 0,8 s par option : une musique autour de 150 BPM (2 temps par option) tombe juste.
Contenu et rythme : `BEATS` dans `src/tiktok/TikTok.tsx`.

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
