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
}

export const LIGHT: Theme = { dark: false, ink: INK, muted: MUTED, bg: SCREEN_BG, card: CARD_BG, hairline: HAIRLINE, accent: ACCENT, tile: "#EEF0F4" };
export const DARK: Theme = { dark: true, ink: "#F2F3F7", muted: "#9A9CAD", bg: "#0B0B12", card: "#16161F", hairline: "#262634", accent: "#9B6BFF", tile: "#1F1F2B" };

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
