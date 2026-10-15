import "server-only";
import type { PlatformId } from "../../types";
import { instagram } from "./instagram";
import { tiktok } from "./tiktok";
import type { PlatformAdapter } from "./types";
import { youtube } from "./youtube";

export const adapters: { [P in PlatformId]: PlatformAdapter<P> } = {
  youtube,
  tiktok,
  instagram,
};
