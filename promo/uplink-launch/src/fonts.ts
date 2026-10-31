import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/inter-tight/200.css";
import "@fontsource/inter-tight/300.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import "@fontsource/inter-tight/800.css";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

const FACES = [
  ...["400", "500", "600", "700", "800"].map((w) => `${w} 40px "Plus Jakarta Sans"`),
  ...["200", "300", "500", "600", "700", "800"].map((w) => `${w} 40px "Inter Tight"`),
];

/** Attend que les polices (Plus Jakarta Sans, Inter Tight) soient chargées avant de capturer la moindre image. */
export function useFonts() {
  const [handle] = useState(() => delayRender("Chargement des polices"));
  useEffect(() => {
    Promise.all(FACES.map((f) => document.fonts.load(f))).then(() => continueRender(handle));
  }, [handle]);
}
