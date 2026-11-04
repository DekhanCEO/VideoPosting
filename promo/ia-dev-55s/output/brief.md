# Brief : « L'IA dans le dev : le guide en 55 s »

## Objectif
Faire comprendre en moins d'une minute, de façon concrète et drôle, comment l'IA aide les développeurs à créer des applications plus vite, puis donner envie de commenter et de suivre le compte.

## Format
- Vidéo verticale 9:16, 1080x1920, 30 i/s, **55 s** (1 650 images).
- Diffusion : TikTok, YouTube Shorts, Instagram Reels.
- Export : MP4 H.264 + AAC 192 kb/s.

## Public
Développeurs juniors, étudiants en informatique, curieux de la tech. Ils connaissent le mot « bug », pas forcément « boilerplate » : chaque notion est donc montrée en image (fenêtres d'erreur, éditeur, loupe, checklist).

## Message clé
> L'IA écrit le répétitif, trouve les bugs, teste et documente, et t'emmène de l'idée à l'application. Elle ne remplace pas le développeur : elle amplifie celui qui sait ce qu'il fait.

## Ton
Énergique, complice, tutoiement, autodérision (les yeux-horloges de Pixo, l'étoile « fonctionnalités » écrasée par une fenêtre d'erreur, l'insecte piégé dans la loupe). Une idée toutes les 4 à 6 s, jamais plus de 2 s sans changement visuel.

## Personnages
- **Pixo** : petit robot rond, incarne l'IA. C'est lui le narrateur : sa bouche suit l'amplitude de la voix (3 formes).
- **Léa** : développeuse en sweat à capuche. Elle apparaît dans le problème (fatiguée), le code (sourit, puis fière), la démo (surprise, puis fière) et la conclusion.

## Décisions prises par défaut
| Sujet | Décision | Pourquoi |
|---|---|---|
| Voix off | **Piper en local, voix française `fr_FR-siwis-medium`** (féminine, naturelle), débit ×1,14 (`length_scale` 0,88) | Aucune clé ElevenLabs dans l'environnement. Le moteur ElevenLabs est câblé et prend le relais automatiquement si `ELEVENLABS_API_KEY` est renseignée dans `.env`. |
| Prononciation | « IA » prononcé « i-a » et « API » « a-pé-i » via des phonèmes forcés ; le texte affiché reste celui du script. | Le moteur local lisait « IA » comme « ya ». |
| Timings des sous-titres | Issus des **alignements phonème → échantillon du TTS** (Piper). | C'est ce que demande la consigne (timestamps du TTS) ; précision de 11 ms. |
| Durée des scènes | Calée sur la voix réelle, au plus près du storyboard : accroche 0–3,7 s, problème 3,7–11,7, code 11,7–20,4, debug 20,4–27,6, tests 27,6–34,6, idée 34,6–44,2, bémol 44,2–49,4, CTA 49,4–55. | L'accroche (2,7 s de voix) et le CTA (4,3 s de voix) ne tiennent pas dans les 3 s prévues pour chacun ; le temps est pris sur les scènes 3 à 6, où la voix laissait de la marge. Le total reste exactement 55 s. |
| Émojis 😅 ⚠️ 👇 | Redessinés en SVG plat. | Le Chromium de rendu n'a pas de police emoji ; c'est aussi plus cohérent avec le style. |
| Limite de 12 mots | Sous-titres de 3 à 4 mots par bloc. « Mais attention ⚠️ » s'efface quand la 3e carte arrive. Le titre de la scène 4 s'efface quand la frise s'allume. Le code de l'éditeur est figuré par des barres colorées (aucun mot). | Respect strict de la limite, vérifié image par image (`npm run audit`). |
| « boilerplate » | Conservé tel quel dans le compteur (terme du script). | Fidélité au storyboard. |
| Transitions | Balayage horizontal de 6 images entre les scènes ; **zoom-flash** sur 3 moments clés : entrée des solutions (scène 3), bémol (scène 7), appel à l'action (scène 8). | Les zooms marquent les bascules du récit. |
| Musique | Composée et synthétisée localement (pop électro, 120 BPM). Filtrée et sombre pendant le problème, break pendant le bémol. | Libre de droits par construction. |
| Bruitages | Synthétisés (pop, whoosh, erreurs, cliquetis clavier, ding, confettis…) et calés sur les mêmes repères que l'image (`src/cues.ts`). | Une seule source de synchronisation pour le son et l'image. |
| Bloc logo / marque | Zone réservée en bas de la scène 8 (y 1170–1330), laissée vide. | Aucune marque fournie. |
| Polices | Poppins Black (titres 120–150 px), Poppins ExtraBold 70 px (sous-titres), Inter 600–700 (textes courants, 48 px minimum). | Conforme à la charte. |
