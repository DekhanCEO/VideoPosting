# Storyboard (1080x1920, 30 i/s, 55,00 s = 1 650 images)

Les instants (en secondes, absolus) sont **calculés à partir des timestamps de la voix** par `src/cues.ts`. Les mêmes repères servent à l'image et aux bruitages. Zones de sécurité : rien d'important au-dessus de y = 250 ni sous y = 1570. Les sous-titres occupent la bande y 1346–1542.

| # | Scène | Images | Début → fin | Durée |
|---|---|---|---|---|
| 1 | Accroche | 0–110 | 0,00 → 3,67 s | 3,67 s |
| 2 | Le problème | 110–351 | 3,67 → 11,70 s | 8,03 s |
| 3 | Utilité 1 : générer du code | 351–613 | 11,70 → 20,43 s | 8,73 s |
| 4 | Utilité 2 : déboguer | 613–829 | 20,43 → 27,63 s | 7,20 s |
| 5 | Utilité 3 : tester et documenter | 829–1037 | 27,63 → 34,57 s | 6,93 s |
| 6 | Utilité 4 : de l'idée à l'app | 1037–1327 | 34,57 → 44,23 s | 9,67 s |
| 7 | Le bémol | 1327–1483 | 44,23 → 49,43 s | 5,20 s |
| 8 | Conclusion + CTA | 1483–1650 | 49,43 → 55,00 s | 5,57 s |

---

## 1. Accroche (0,00 → 3,67 s)
- **Personnages** : Pixo en très gros plan, avec un zoom continu sur ses yeux (×1 → ×1,55).
- **Texte** : « Tu codes / encore / sans IA ? 😅 » (Poppins Black 146 px). Chaque mot rebondit au moment où il est prononcé. « IA ? » est en orange.
- **Animation** :
  - 1,5 s : le texte tremble et Pixo écarquille les yeux ;
  - 1,9 s : flash orange plein écran, et « IA ? » passe en pastille orange ;
  - 2,7 s (« heures ») : les yeux de Pixo deviennent des horloges qui tournent.
- **Son** : pop d'entrée, glitch, impact sur le flash, tic-tac.
- **Sortie** : balayage horizontal (6 images, bord cyan/violet).

## 2. Le problème (3,67 → 11,70 s)
- **Personnages** : Léa, fatiguée (paupières lourdes, cernes, goutte de sueur), derrière son ordinateur.
- **Éléments** : dix fenêtres d'erreur tombent en cascade autour d'elle (de 3,9 à 9,7 s), avec un rebond à l'atterrissage.
- **Compteurs animés** (cartes qui glissent depuis la gauche ; le chiffre compte depuis 0) :
  - « 2 h de boilerplate » à 6,5 s (« répétitif ») ;
  - « 6 h de bugs » à 7,7 s ;
  - « 3 h de doc » à 8,5 s.
  - Affichage final de haut en bas : 6 h de bugs · 3 h de doc · 2 h de boilerplate.
- **Gag** : à 9,6 s (« fonctionnalités »), une étoile dorée apparaît. Léa la regarde, surprise, puis la dernière fenêtre d'erreur tombe dessus et l'écrase (elle devient grise).
- **Son** : musique filtrée et sombre, « bip » d'erreur à chaque fenêtre, « wah-wah » triste sur l'étoile.
- **Sortie** : zoom-flash.

## 3. Utilité 1 : générer du code (11,70 → 20,43 s)
- **Titre** : [1] « Il écrit le / code répétitif. » (rebond, « répétitif » en cyan).
- **Éditeur animé** (carte qui glisse) avec trois onglets synchronisés sur la voix :
  - Form.tsx à 12,1 s ;
  - User.ts à 13,0 s ;
  - api.ts à 14,1 s.
  - Les lignes s'écrivent seules, avec un curseur clignotant. Le code est figuré par des barres colorées.
- **15,2 s (« génère »)** : 24 lignes défilent d'un coup et l'éditeur s'illumine en cyan.
- **16,4 s (« secondes »)** : un chrono orange compte jusqu'à « 0,8 s ».
- **Personnages** :
  - Pixo, en bas à gauche, pointe l'écran ;
  - Léa, en bas à droite, sourit, puis est surprise au moment du défilement ;
  - à 18,3 s (« logique »), Léa devient fière, lève le pouce, et une ampoule apparaît.
- **Son** : cliquetis de clavier (plus rapides pendant la génération), scintillement, ding.
- **Sortie** : balayage horizontal.

## 4. Utilité 2 : déboguer (20,43 → 27,63 s)
- **Titre** : [2] « Il trouve / les bugs. » (« bugs » en orange).
- **Terminal** : une ligne rouge « ✗ TypeError ».
- **Animation** :
  - 21,0 s : un insecte traverse l'écran en zigzag (bourdonnement) ;
  - 22,5 s (« Colle ») : le message d'erreur vole du terminal vers Pixo ;
  - 23,2 s : une loupe arrive en glissant et piège l'insecte, qui se débat ;
  - 25,0 s (« cause ») : Pixo pointe le terminal et l'étiquette « ligne 42 » apparaît ;
  - 26,1 s (« correctif ») : la ligne passe au vert « ✓ Corrigé » et l'insecte disparaît dans une explosion de confettis.
- **Son** : buzz, zap, confettis, ding.
- **Sortie** : balayage horizontal.

## 5. Utilité 3 : tester et documenter (27,63 → 34,57 s)
- **Titre** : [3] « Il teste et / documente. » (en vert).
- **Checklist** : login(), panier(), paiement(), profil(), cochés un à un à 28,2 / 28,6 / 29,5 / 30,5 s.
- **Page de documentation** : elle glisse depuis la droite à 30,7 s et s'écrit ligne à ligne (titre, paragraphes, bloc de code).
- **32,9 s (« prompt »)** : une barre de prompt monte et Pixo valide. La doc se termine d'un coup, une coche apparaît, et Pixo a des yeux-étoiles.
- **Son** : double note de validation à chaque test, scintillement.
- **Sortie** : balayage horizontal.

## 6. Utilité 4 : de l'idée à l'application (34,57 → 44,23 s)
- **Titre** : [4] « De l'idée à / l'application. » (orange). Il s'efface à 36,5 s, quand la frise prend la place.
- **Frise verticale** (icône, coche, libellé qui glisse) :
  - Idée à 35,5 s ;
  - Maquette à 36,8 s ;
  - Code à 38,5 s ;
  - Mise en ligne à 39,7 s.
  - Le trait cyan se remplit entre les étapes.
- **40,2 s** : la frise se replie en ligne compacte en haut de l'écran. Pixo arrive en saluant.
- **Compteur** :
  - « x1 plus rapide » apparaît, puis passe à « x3 » à 41,8 s (« jours ») avec un impact ;
  - calendrier vert ✓ (jours) ;
  - à 43,1 s (« semaines »), calendrier gris ✗.
- **Léa** : souriante, puis surprise, puis fière (pouce levé).
- **Sortie** : zoom-flash.

## 7. Le bémol (44,23 → 49,43 s)
- **Fond** : assombri.
- **Texte** : « Mais / attention ⚠️ » (le ⚠️ pulse). Le texte s'efface à 47,6 s pour respecter la limite de 12 mots.
- **Pixo** : sérieux (paupières mi-closes, sourcils froncés), lève l'index à 44,4 s. À 46,9 s (« amplifie »), son antenne émet des ondes et il passe en mode « fier ».
- **Trois cartes** en glissement latéral alterné :
  - « Relis le code » (œil) à 45,6 s ;
  - « Teste » (fiole) à 46,7 s ;
  - « Comprends ce que tu fais » (cerveau) à 47,8 s.
- **Son** : break musical (nappe seule), double note d'alerte, swish.
- **Sortie** : zoom-flash.

## 8. Conclusion + appel à l'action (49,43 → 55,00 s)
- **Texte** : « Tu codes avec / ou sans IA ? 👇 » (« avec » en cyan, « sans » en orange). La main 👇 rebondit.
- **Personnages** : Pixo et Léa côte à côte, ils saluent.
- **Animation** :
  - 50,4 s (« commentaire ») : une bulle de commentaire avec des points de saisie animés ;
  - 53,1 s (« suis ») : bouton orange « + Suivre », pouce levé de Léa.
- **Bloc logo / marque** : zone y 1170–1330 réservée et laissée vide (aucune marque fournie).
- **Fin** : accord final sur la dernière demi-seconde, fondu audio de 0,25 s.
