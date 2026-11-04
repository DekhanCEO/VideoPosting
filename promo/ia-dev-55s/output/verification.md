# Vérification du rendu

Fichier : `output/video_9x16_1080p.mp4` (12.7 Mo) · TTS : Piper (local) · fr_FR-siwis-medium

| Contrôle | Résultat | Détail |
|---|---|---|
| Durée entre 50 et 58 s | ✅ | 55.02 s |
| Vidéo H.264 1080x1920 | ✅ | h264 1080x1920 @ 30/1, yuv420p |
| Audio AAC 192 kb/s | ✅ | aac 189 kb/s, 48000 Hz, 2 canaux |
| Aucun texte hors cadre | ✅ | 550 images mesurées (1 sur 3), 0 débordement(s) ; 2 entrée(s) en glissement depuis le bord, transitoires (< 6 images) |
| Aucun texte hors zones de sécurité (250 px haut / 350 px bas) | ✅ | 0 texte(s) hors zone |
| 12 mots max à l'écran | ✅ | maximum mesuré : 12 mots (image 981, transitions de 6 images exclues) |
| Audio du MP4 calé sur la bande-son | ✅ | décalage +0.0 ms |
| Attaque de chaque réplique vs sous-titre | ✅ | 13 répliques, écart max 63 ms |
| Mots reconnus (ASR) vs sous-titres | ✅ | 118/144 mots appariés · latence du modèle 340 ms retirée · écart médian 43 ms, 90e centile 113 ms · 96 % ≤ 150 ms |
| Pas d'écrêtage | ✅ | crête échantillon -1.1 dBFS, crête vraie -1.1 dBTP, 0 échantillon(s) saturé(s), -14.8 LUFS intégrés |
| Musique -12 dB pendant la voix | ✅ | -12.0 dB pendant la voix, -0.1 dB hors voix (1.2 s sans voix) |

Images témoins : `output/checks/frame_00s.jpg` … `frame_54s.jpg`.
