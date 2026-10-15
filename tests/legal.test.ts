import assert from "node:assert/strict";
import { test } from "node:test";
import { DATA_DELETION_ANCHOR, LEGAL_PAGES, legalInfo, legalUrl } from "../src/lib/legal";

test("pages légales : valeurs par défaut et nettoyage", () => {
  assert.deepEqual(legalInfo(null), { serviceName: "VideoPosting", editor: "", email: "" });
  assert.deepEqual(legalInfo({ serviceName: "  ", editor: " Malabop ", email: " a@b.fr " }), { serviceName: "VideoPosting", editor: "Malabop", email: "a@b.fr" });
});

test("pages légales : adresses à indiquer aux plateformes", () => {
  // Hébergement PHP : export statique avec « / » final, sous le dossier du site.
  assert.equal(legalUrl("https://malabop.fr/posting", LEGAL_PAGES.terms.path, true), "https://malabop.fr/posting/conditions/");
  assert.equal(
    legalUrl("https://malabop.fr/posting/", LEGAL_PAGES.privacy.path, true, DATA_DELETION_ANCHOR),
    "https://malabop.fr/posting/confidentialite/#suppression",
  );
  // Serveur Node.js.
  assert.equal(legalUrl("https://studio.exemple.fr", LEGAL_PAGES.privacy.path, false), "https://studio.exemple.fr/confidentialite");
});
