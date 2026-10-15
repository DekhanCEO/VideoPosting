import "server-only";
import type {
  Account,
  AccountSnapshot,
  AudienceDemographics,
  DailyMetric,
  MediaAsset,
  PlatformId,
  PlatformOptionsMap,
  Post,
  PostKind,
  PostMetrics,
} from "../../types";
import type { ResolvedCredentials } from "../config";

export type AccountData = Omit<Account, "connectedAt">;

export interface PublishContext<P extends PlatformId = PlatformId> {
  post: Post;
  /** video : la vidéo · photo : la première photo (voir images). */
  media: MediaAsset;
  filePath: string;
  kind: PostKind;
  /** Publication photo : toutes les photos, dans l'ordre. */
  images: MediaAsset[];
  account: Account;
  credentials: ResolvedCredentials;
  options: PlatformOptionsMap[P];
  /** Image de couverture personnalisée (YouTube). */
  thumbnail?: { filePath: string; mimeType: string; size: number };
  progress: (percent: number, step?: string) => void;
  log: (message: string, level?: "info" | "warn" | "error") => void;
  signal: AbortSignal;
}

export interface PublishResult {
  externalId?: string;
  url?: string;
}

export interface StatsResult {
  snapshot?: Omit<AccountSnapshot, "date" | "platform">;
  daily?: Omit<DailyMetric, "platform">[];
  /** Métriques par identifiant externe de vidéo. */
  posts?: Record<string, Omit<PostMetrics, "updatedAt">>;
  revenueAvailable?: boolean;
  /** Répartition de l'audience (genre, âge, pays), si la plateforme la fournit. */
  audience?: Pick<AudienceDemographics, "basis" | "gender" | "ages" | "countries" | "cities">;
  warnings?: string[];
}

export interface PlatformAdapter<P extends PlatformId = PlatformId> {
  id: P;
  buildAuthUrl(args: { state: string; redirectUri: string; credentials: ResolvedCredentials }): string;
  exchangeCode(args: { code: string; redirectUri: string; credentials: ResolvedCredentials }): Promise<AccountData>;
  /** Renouvelle le jeton d'accès ; renvoie les champs à mettre à jour sur le compte. */
  refresh?(account: Account, credentials: ResolvedCredentials): Promise<Partial<Account>>;
  publish(ctx: PublishContext<P>): Promise<PublishResult>;
  fetchStats?(args: {
    account: Account;
    credentials: ResolvedCredentials;
    externalIds: string[];
    days: number;
  }): Promise<StatsResult>;
}
