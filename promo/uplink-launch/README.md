# Uplink — plan de lancement (Remotion)

Animation verticale de 5 s (1080×1920, 30 i/s) : un téléphone en 3D CSS arrive incliné et pivote en trois quarts avec un
ressort lourd (légère sur-rotation), l'écran d'accueil d'Uplink se construit pendant l'atterrissage (chiffre qui compte
sur des chiffres à chasse fixe, graphique tracé, lignes qui montent), puis trois cartes naissent d'une pilule, d'une puce
et d'un disque, sans fondu. Flottement en parallaxe, puis plan fixe sur la dernière seconde.

## Personnaliser

Tout le contenu est dans `src/config.ts` : nom de l'application, couleur d'accent, chiffre principal, courbe, trois
lignes, trois cartes et rythme (en images).

## Rendre

```bash
npm install
npm run studio                      # aperçu interactif
npm run render                      # out/uplink-launch.mp4
npm run render -- --browser-executable=/chemin/vers/chrome-headless-shell   # si Chrome ne peut pas être téléchargé
```

Rendu : H.264, CRF 14, yuv420p, images intermédiaires PNG (voir `remotion.config.ts`).
