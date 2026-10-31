import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

/** Attend que Plus Jakarta Sans soit chargée avant de capturer la moindre image. */
export function useFonts() {
  const [handle] = useState(() => delayRender("Chargement de Plus Jakarta Sans"));
  useEffect(() => {
    Promise.all(["400", "500", "600", "700", "800"].map((w) => document.fonts.load(`${w} 40px "Plus Jakarta Sans"`))).then(() => continueRender(handle));
  }, [handle]);
}
