import React from "react";

/**
 * Nombre sur chiffres à chasse fixe : chaque chiffre occupe une case de 0,5 em (largeur des chiffres de Plus Jakarta Sans),
 * le comptage ne fait donc jamais bouger la mise en page.
 */
export const Num: React.FC<{ value: number; decimals?: number; style?: React.CSSProperties }> = ({ value, decimals = 0, style }) => {
  const text = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  return (
    <span style={{ display: "inline-flex", fontFeatureSettings: '"tnum", "lnum"', fontKerning: "none", ...style }}>
      {Array.from(text).map((c, i) =>
        /\d/.test(c) ? (
          <span key={i} style={{ display: "inline-block", width: "0.5em", textAlign: "center" }}>
            {c}
          </span>
        ) : (
          <span key={i} style={{ display: "inline-block", width: c === "," ? "0.24em" : "0.18em", textAlign: "center" }}>
            {c === "," ? "," : " "}
          </span>
        ),
      )}
    </span>
  );
};
