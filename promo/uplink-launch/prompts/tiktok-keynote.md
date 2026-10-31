# Prompt — vidéo TikTok Uplink (direction artistique keynote)

Prompt complet pour reproduire la composition `TikTok` (`src/tiktok/NouvelleDA.tsx`). Rédigé en anglais comme les
prompts de référence ; les textes à l'écran restent en français, à l'identique.

```text
Build a 15-second, 9:16 TikTok ad (1080x1920, 30 fps, exactly 450 frames) in Remotion for a creator app called "Uplink" (user: "Dekhan", initials "DK"). No audio. All on-screen copy is in French and must be used verbatim.

ART DIRECTION — Apple keynote style
- Flat light ground #EEEEEC everywhere (never a coloured background, no vignette). Ink #111113, secondary grey #86868B, white cards #FFFFFF. Inter Tight only (weights 500–800), tight tracking (-0.045em on headlines).
- One red accent dot #FF3B30, and only one red element on screen at a time: it is born from the platform logos in the hook, then it is the full stop of every headline.
- Soft layered shadows on every card, phone and tile: 0 1px 1px, 0 3px 6px, 0 10px 20px, 0 26px 52px, 0 56px 110px in rgba(17,17,19) at 4/5/6/8/10 % opacity.
- Springs at about 10 % overshoot (mass 1, stiffness 170, damping 15.4) unless stated otherwise. Counters never overshoot (ease-out).
- Speed-based motion blur on everything that moves fast (phones incl. rotation speed, cards, logos, flying text): directional SVG feGaussianBlur whose per-axis deviation is ~0.3 × the per-frame displacement, capped at 10–12 px.
- No fades and no white flashes anywhere. Things appear by growing, popping or rising out of a mask; shots change only by motion (zoom-in or whip pan).
- TikTok safe zones: nothing important above y=230, right of x=930 between y=850 and 1500, or below y=1450.
- The last second (frames 420–450) is a frozen hold.

SHARED ELEMENTS
- Headline system (each shot): block at top 236, left 64, right 150. Title in Inter Tight 700, 116 px, line-height 1.04, max two lines ("|" = line break). Optional sub-line 44 px, weight 600, grey, 18 px below. Every word rises from a mask (translateY 115 % → 0 with the 10 % spring), words staggered 2 frames, first word 2 frames after the shot starts, sub-line after the last word. The title's final "." is drawn in red. Words exit upwards through the mask (6 frames, ease-in) 6 frames before the shot ends, except when the next shot arrives by whip pan (then the text leaves with the pan).
- 3D phone in CSS 3D: body 500×1030, corner radius 80, 30 px thick (18 stacked slices with a graphite metal gradient), side buttons, 13 px black bezel, screen 474×1004, Dynamic Island, a soft glare. Perspective 2600 px, origin 50 % 58 %. Phone centre at (540, 1110); poses below are rotY / rotX / rotZ (deg), x / y offsets (px) and scale. A blurred elliptical floor shadow sits under each phone (width follows |cos rotY| and scale).
- Phone UI = the real Uplink app restyled in the same direction: Inter Tight, ink accent (no colour), screen #F5F5F3, cards white, hairlines #E5E5E2, neutral tiles #EEEEEC, solid badges ink with white text, toggles ink. Dark variant: background #0A0A0B, cards #1C1C1E, text #F5F5F7, accent #8E8E93. Counting numbers in the UI use fixed 0.64 em digit slots so nothing jitters. App screens are time-remapped (fast-forwarded with an ease-out) so each screen's whole animation plays within its shot.
- Brand tiles: ink squares (radius 29 %) with white TikTok / YouTube / Instagram logos.

TIMELINE

HOOK, frames 0–84 (ink type on the light ground, centred, text block top 450):
- Line 1 "Arrête de publier" 96 px / 700. Line 2 "3 fois" 270 px / 800 / -0.06em. Line 3 "la même vidéo." 96 px.
- Frame 0 is already in motion: "3 fois" slams in from 1.9× scale (spring started at frame -3) under line 1; line 3 rises at frame 6.
- Three ink brand tiles (136 px) pop at frames 10 / 14 / 18 at y=1216, x=360 / 540 / 720, each turning in from -20°.
- Frames 30–36: an ink strike bar (18 px, rotated -5°) draws across "3 fois" from the left; frames 40–45 it retracts to the right.
- Frame 40: line 1 swaps to "Publie-la" (old text leaves upwards through a mask, new text rises in 4 frames later). Frame 42: the "3" rolls vertically into "1" (odometer roll, " fois" stays). Frame 44: line 3 swaps to "partout.".
- Frames 50–62: the three tiles slide into the centre (540, 1216), shrinking to 0.2 and spinning ±60°, with motion blur. Frame 58: the red dot (52 px) pops out of the merge point.
- Frames 74–84: the camera dives into the red dot (whole frame scales up ×3.4 around it, blur up to 16 px).

SHOT 1 — frames 84–162 (78 f), enters with a zoom-in (frame scales 1.4 → 1 with blur 16 → 0 over 8 frames, ease-out).
- Title: "1 clic.|3 plateformes."
- The phone flies in spinning (spring mass 1.1, stiffness 110, damping 13.8) from rotY -200 / rotX 28 / rotZ -12 / y +700 / scale 0.6 to rotY -6 / rotX 7 / y +40 / scale 0.92.
- Local frame 22 (10 % spring): the phone splits into three. Centre phone goes to rotY 0, scale 0.84. Two clones slide out from behind it to x ±330, rotY ∓28 (both face inwards), rotZ ±2, y +70, scale 0.74. All three then drift -5° in rotY until the end.
- Screens: the centre phone shows the composer ("Nouvelle publication", "clutch.mp4" upload bar filling, TikTok / YouTube / Instagram chips ticking, caption typing "Clutch 1v4 en ranked 🔥 Le round qui a tout retourné.", hashtags #valorant #clutch #fyp), then at local 24 a 6-frame push transition to the settings screen on the YouTube tab (Format: Auto / Short / Vidéo longue with Short selected, Visibilité "Publique", toggles "Notifier les abonnés" and "Miniature personnalisée" on). Left clone: settings on the TikTok tab ("Qui peut voir cette vidéo ?" → "Tout le monde", Commentaires / Duo / Collage on, "Publier directement"). Right clone: settings on the Instagram tab (Reel, cover strip).
- Local 30 / 33 / 36: ink brand tiles (124 px) pop under each phone at y=1390, x=210 / 540 / 870, pushed 200 px towards the camera, floating gently.

SHOT 2 — frames 162–234 (72 f), arrives by whip pan from the right (both shots slide 1080 px over 6 frames with up to 22 px horizontal blur; the outgoing shot leaves to the left).
- Title: "Programme." Sub-line: "Uplink publie à ta place."
- Giant "19:00" in Inter Tight 700, 300 px, tabular figures, tracking -0.055em, ink, centred at y=650; each character rises out of its own mask, staggered 1.5 frames from local 8.
- Below it, the phone tilted (spring stiffness 100, damping 11.8, from local 2) from rotY 42 / rotX 10 / rotZ -9 / x +300 / y +270 / scale 0.72 to rotY 20 / rotX 8 / rotZ -6 / x +30 / y +170 / scale 0.78, then a further -8° rotY drift. Screen: the schedule screen ("Quand publier ?", "Programmer" segment selected, chip "Ce soir 19:00", October 2026 calendar with the 31st circled in ink, card "Ven. 31 oct. à 19:00" with a "Programmé" badge).

SHOT 3 — frames 234–306 (72 f), whip pan from the left.
- Title: "Ta commu|prévenue." Sub-line: "Les liens partent sur Discord."
- Low-angle phone (spring stiffness 90, damping 11.2) from rotY -40 / rotX -4 / rotZ 3 / x +430 / y +60 / scale 0.88 to rotY -24 / rotX -5 / rotZ 2 / x +180 / y +60 / scale 0.9, plus +6° rotY drift. Screen: the "Annonces Discord" screen (webhooks #annonces and #vip-clips marked "Actif", preview of the bot message).
- Local 10: a white Discord message card (700 px wide, radius 34, layered shadow) flies out of the phone towards the camera (spring stiffness 120, damping 12.9): from (720, 1180), scale 0.35, z 0, rotY -24° to (440, 1070), scale 1, z +230, rotY -8°, then floats ±5 px. Content: 58 px ink app tile with a white play glyph, "Uplink" 27 px bold, ink "APP" badge, "Aujourd'hui à 19:00" in grey, ink Discord logo on the right; then 23 px grey lines with bold ink labels, each rising 3 frames apart: "Clutch 1v4 en ranked est en ligne !", "TikTok · tiktok.com/@dekhan/video/7425…", "YouTube · youtube.com/shorts/Vq3dX8…", "Instagram · instagram.com/reel/DBk2pQ…".

SHOT 4 — frames 306–378 (72 f), zoom-in transition.
- Title: "Tes stats.|Tes revenus." (no sub-line)
- Three white stat cards stacked from top 610 (left 64, right 150, height 196, radius 38, gap 26, layered shadow). Each card: a 124 px #EEEEEC tile with an ink symbol (58 px bold), then the number (86 px, weight 800, tabular) over a 34 px grey label:
  "↑" "+5 990" "abonnés en 28 jours" · "%" "12,8 %" "taux d'influence" · "€" "4 918,98 €" "de revenus ce mois".
- Cards pop at local 10 / 18 / 26 (10 % spring from translateX -140, scale 0.6, rotate -6°, origin left, with motion blur); each number counts up from 0 over 16 frames with a strong ease-out, French number formatting.

SHOT 5 — frames 378–450 (72 f), whip pan from the left.
- The phone pulls back (spring mass 1.1, stiffness 80, damping 11.8) from rotY -8 / rotX 6 / y +40 / scale 1.3 to rotY -24 / rotX 9 / rotZ 2 / y +150 / scale 0.84, with a slight sway that dies out by local 50. Screen: the home screen ("Bonsoir, Dekhan", audience "171 140" with its line chart, "Dernières publications") switching to the dark theme through a circular reveal from the top-right corner (local 11–40).
- Lockup at top 236: 100 px ink app tile (white play glyph) springing in with a small turn, "Uplink" 112 px bold with letters rising 1 frame apart; then "Publie partout." / "Pilote tout." in 80 px bold (the final "." in red); then an ink pill "www.dsociety.fr/uplink" (36 px bold white) popping at local 22.
- Frames 420–450: frozen hold.

QUALITY CHECKS
Exactly 450 frames, yuv420p H.264. Frame 0 already shows "Arrête de publier" and "3 fois". Every headline readable for at least ~1.5 s. Exactly one red element per frame. No opacity fades or white flashes. No layout jitter in counting numbers. Text stays inside the TikTok safe zones.
```
