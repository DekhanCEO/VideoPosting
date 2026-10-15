/**
 * Nom de l'application, affiché partout dans l'interface, les annonces Discord et les pages légales.
 * Pour le changer : NEXT_PUBLIC_APP_NAME au moment du build (option --name du paquet hébergement),
 * et 'app_name' dans api/config.php pour la partie PHP.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Uplink";
export const APP_TAGLINE = "Studio de publication multi-plateforme";
