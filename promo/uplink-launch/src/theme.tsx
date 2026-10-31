import React, { createContext, useContext } from "react";
import { ACCENT, CARD_BG, HAIRLINE, INK, MUTED, SCREEN_BG } from "./config";

/** Couleurs de l'interface du téléphone (thème clair ou sombre). */
export interface Theme {
  dark: boolean;
  ink: string;
  muted: string;
  bg: string;
  card: string;
  hairline: string;
  accent: string;
  tile: string; // fond des vignettes neutres
  /** Police de l'interface (Plus Jakarta Sans par défaut). */
  font?: string;
  /** Largeur d'une case de chiffre pour les nombres qui comptent (em), selon la police. */
  numSlot?: number;
}

export const LIGHT: Theme = { dark: false, ink: INK, muted: MUTED, bg: SCREEN_BG, card: CARD_BG, hairline: HAIRLINE, accent: ACCENT, tile: "#EEF0F4" };
export const DARK: Theme = { dark: true, ink: "#F2F3F7", muted: "#9A9CAD", bg: "#0B0B12", card: "#16161F", hairline: "#262634", accent: "#9B6BFF", tile: "#1F1F2B" };

/** Direction artistique « keynote » : encre presque noire, gris neutres, Inter Tight (l'accent est l'encre). */
const INTER_TIGHT = '"Inter Tight", sans-serif';
export const KEYNOTE_LIGHT: Theme = { dark: false, ink: "#111113", muted: "#86868B", bg: "#F5F5F3", card: "#FFFFFF", hairline: "#E5E5E2", accent: "#111113", tile: "#EEEEEC", font: INTER_TIGHT, numSlot: 0.64 };
export const KEYNOTE_DARK: Theme = { dark: true, ink: "#F5F5F7", muted: "#8E8E93", bg: "#0A0A0B", card: "#1C1C1E", hairline: "#2C2C2E", accent: "#8E8E93", tile: "#2C2C2E", font: INTER_TIGHT, numSlot: 0.64 };

const ThemeContext = createContext<Theme>(LIGHT);

export const ThemeProvider: React.FC<{ theme: Theme; children: React.ReactNode }> = ({ theme, children }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);

/** Utilisateur affiché dans l'application. */
export interface AppUser {
  name: string;
  initials: string;
  handle: string;
}

const UserContext = createContext<AppUser>({ name: "DSociety", initials: "DS", handle: "dsociety" });

export const UserProvider: React.FC<{ user: AppUser; children: React.ReactNode }> = ({ user, children }) => (
  <UserContext.Provider value={user}>{children}</UserContext.Provider>
);

export const useUser = () => useContext(UserContext);
