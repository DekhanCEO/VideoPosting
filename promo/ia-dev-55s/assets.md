# Assets

Tout est produit dans ce dossier : aucune image, police ou son externe n'est à licencier.

## Couleurs (`src/theme.ts`)
| Rôle | Valeur |
|---|---|
| Fond bleu nuit | `#0F172A` (cartes `#1E293B`, `#273449`) |
| Accent violet | `#8B5CF6` (foncé `#6D28D9`, clair `#C4B5FD`) |
| Accent cyan | `#22D3EE` |
| Orange « moments forts » | `#F97316` (flash, mots-clés prononcés, chiffres, CTA) |
| Texte | `#F8FAFC` |
| États | rouge `#F43F5E` (erreurs), vert `#22C55E` (validé), jaune `#FACC15` (étoile, ampoule) |

## Polices (paquets `@fontsource`, licence OFL)
- **Poppins Black 900** : titres (120 à 150 px) et chiffres.
- **Poppins ExtraBold 800** : sous-titres (70 px).
- **Inter 600 / 700** : textes courants (48 à 64 px).

## Illustrations (SVG plats, `src/characters`, `src/components/icons.tsx`)
- **Personnages** :
  - Pixo (robot rond, visière, yeux, sourcils, 3 bouches, bras articulés, propulseur, antenne) ;
  - Léa (buste, sweat à capuche violet, lunettes rondes, chignon, 5 expressions).
- **Émojis redessinés** : 😅 ⚠️ 👇.
- **Icônes** : coche, croix, ampoule, maquette, code `</>`, fusée, œil, fiole, cerveau, bulle de commentaire, étoile, sablier, chronomètre, calendrier, loupe, insecte, fenêtre d'erreur.

## Sons (synthétisés par `scripts/soundtrack.py`)
- **Musique** : pop électro à 120 BPM, en la mineur / do majeur (vi–IV–I–V). Elle comprend grosse caisse, clap, charleston, basse en croches, arpège « pluck » et nappe. Elle est filtrée et sombre pendant le problème, réduite à un break pendant le bémol, et se termine par un accord final.
- **Bruitages** : pop, whoosh / swish, zoom, impact, glitch, tic-tac, erreur, « wah-wah », touches de clavier, scintillement, ding, double note de validation, buzz d'insecte, zap, confettis, alerte, bulle.
- **Mixage** :
  - musique à −12 dB pendant la voix (enveloppe 60 ms / 250 ms) ;
  - bruitages à −6 dB sous la voix ;
  - crête à −1 dBFS, environ −15 LUFS intégrés.

## Voix
- **Piper** (local) : voix `fr_FR-siwis-medium` (modèle VITS, sherpa-onnx / rhasspy, licence du jeu de données SIWIS). Téléchargée par `npm run models`.
- **Option ElevenLabs** : voix et modèle réglables dans `.env`.
