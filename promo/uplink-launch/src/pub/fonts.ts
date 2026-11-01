import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

const FACES = ['500 40px "Geist Sans"', '600 40px "Geist Sans"', '500 40px "Inter"', '600 40px "Inter"'];

/** Attend que Geist Sans et Inter soient chargées avant la première image. */
export function usePubFonts() {
  const [handle] = useState(() => delayRender("Polices de la publicité"));
  useEffect(() => {
    Promise.all(FACES.map((f) => document.fonts.load(f))).then(() => continueRender(handle));
  }, [handle]);
}
