export const PLATFORM_IDS = ["tiktok", "youtube", "instagram"] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];

export function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === "string" && (PLATFORM_IDS as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* Médias                                                              */
/* ------------------------------------------------------------------ */

export type MediaKind = "video" | "image";

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBytes: number;
  status: "uploading" | "ready";
  duration?: number; // secondes
  width?: number;
  height?: number;
  posterId?: string; // image extraite de la vidéo (vignette pour l'interface)
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Options par plateforme                                              */
/* ------------------------------------------------------------------ */

export type YoutubePrivacy = "public" | "unlisted" | "private";
/** auto : Short si la vidéo est verticale (ou carrée) et dure 3 min max · short · long : vidéo classique. */
export type YoutubeFormat = "auto" | "short" | "long";

export interface YoutubeOptions {
  title: string;
  description: string;
  tags: string[];
  sync: { title: boolean; description: boolean; tags: boolean };
  categoryId: string;
  privacy: YoutubePrivacy;
  madeForKids: boolean;
  notifySubscribers: boolean;
  embeddable: boolean;
  license: "youtube" | "creativeCommon";
  containsSyntheticMedia: boolean;
  defaultLanguage: string;
  thumbnailId?: string; // image personnalisée (MediaAsset de type image)
  format?: YoutubeFormat;
}

export type TiktokPrivacy =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

export interface TiktokOptions {
  caption: string;
  sync: { caption: boolean };
  mode: "direct" | "inbox";
  privacyLevel: TiktokPrivacy | "";
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  coverTimestampMs: number;
  commercialContent: boolean;
  yourBrand: boolean;
  brandedContent: boolean;
  isAigc: boolean;
  /** Publications photo : TikTok ajoute une musique recommandée. */
  autoAddMusic?: boolean;
}

export interface InstagramOptions {
  caption: string;
  sync: { caption: boolean };
  shareToFeed: boolean;
  thumbOffsetMs: number;
  collaborators: string[];
  audioName: string;
  locationId: string;
}

export interface PlatformOptionsMap {
  youtube: YoutubeOptions;
  tiktok: TiktokOptions;
  instagram: InstagramOptions;
}

/* ------------------------------------------------------------------ */
/* Publications                                                        */
/* ------------------------------------------------------------------ */

export interface CommonContent {
  title: string;
  description: string;
  hashtags: string[];
}

/** video : une vidéo (Short / vidéo longue, Reel, vidéo TikTok) · photo : 1 à 35 photos (publication ou carrousel). */
export type PostKind = "video" | "photo";

export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "partial" | "failed";

export type PublicationStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "published"
  | "failed"
  | "canceled";

export interface PublicationLog {
  at: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface PostMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  /** Abonnés gagnés grâce à la vidéo (YouTube Analytics). */
  followersGained?: number;
  /** Comptes uniques touchés (Instagram). */
  reach?: number;
  updatedAt: number;
}

export interface Publication {
  platform: PlatformId;
  status: PublicationStatus;
  progress: number; // 0 → 100
  step?: string;
  externalId?: string;
  url?: string;
  error?: string;
  attempt: number;
  demo?: boolean;
  startedAt?: number;
  finishedAt?: number;
  logs: PublicationLog[];
  metrics?: PostMetrics;
}

export interface Post {
  id: string;
  status: PostStatus;
  kind?: PostKind;
  mediaId?: string;
  imageIds?: string[];
  common: CommonContent;
  platforms: PlatformId[];
  options: PlatformOptionsMap;
  scheduledAt?: number | null;
  publications: Partial<Record<PlatformId, Publication>>;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
}

/** Ce que le client envoie pour créer / modifier une publication. */
export interface PostInput {
  kind?: PostKind;
  mediaId?: string;
  imageIds?: string[];
  common: CommonContent;
  platforms: PlatformId[];
  options: PlatformOptionsMap;
  scheduledAt?: number | null;
}

/* ------------------------------------------------------------------ */
/* Comptes                                                             */
/* ------------------------------------------------------------------ */

export interface Account {
  platform: PlatformId;
  externalId: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  refreshExpiresAt?: number;
  scopes?: string[];
  meta?: Record<string, string | number | boolean | undefined>;
  connectedAt: number;
  demo?: boolean;
}

/** Version d'un compte exposée au navigateur (sans jetons). */
export interface PublicAccount {
  platform: PlatformId;
  name: string;
  username?: string;
  avatarUrl?: string;
  expiresAt?: number;
  connectedAt: number;
  demo?: boolean;
  needsReconnect: boolean;
  meta?: Record<string, string | number | boolean | undefined>;
}

/* ------------------------------------------------------------------ */
/* Paramètres                                                          */
/* ------------------------------------------------------------------ */

export type InstagramLoginType = "instagram" | "facebook";

export interface HashtagGroup {
  id: string;
  name: string;
  tags: string[];
}

export interface Settings {
  demoMode: boolean;
  credentials: {
    youtube: { clientId: string; clientSecret: string };
    tiktok: { clientKey: string; clientSecret: string };
    instagram: { appId: string; appSecret: string; loginType: InstagramLoginType; graphVersion: string };
  };
  hashtagGroups: HashtagGroup[];
  currency: string;
  monthlyRevenueGoal: number;
  defaults: {
    youtubeCategoryId: string;
    youtubePrivacy: YoutubePrivacy;
    youtubeLanguage: string;
    tiktokAllowComments: boolean;
    tiktokAllowDuet: boolean;
    tiktokAllowStitch: boolean;
    instagramShareToFeed: boolean;
  };
  revenueEstimates?: RevenueEstimates;
}

/**
 * Estimation automatique des revenus que les plateformes ne communiquent pas par API.
 * Montants dans la devise des paramètres.
 */
export interface RevenueEstimates {
  enabled: boolean;
  /** Revenu pour 1 000 vues (programme Creator Rewards). 0 = pas d'estimation. */
  tiktokRpm: number;
  /** Revenu pour 1 000 vues (bonus Reels, abonnements…). 0 = pas d'estimation. */
  instagramRpm: number;
  /** Part nette perçue par abonnement Twitch de niveau 1 (niveau 2 ×2, niveau 3 ×5). */
  twitchSubValue: number;
  /** Valeur d'un bit Twitch. */
  twitchBitValue: number;
}

/** Paramètres renvoyés au navigateur : les secrets sont masqués. */
export interface PublicSettings {
  demoMode: boolean;
  publicUrl: string;
  publicUrlIsReachable: boolean;
  credentials: {
    youtube: { clientId: string; hasSecret: boolean; fromEnv: boolean; configured: boolean };
    tiktok: { clientKey: string; hasSecret: boolean; fromEnv: boolean; configured: boolean };
    instagram: {
      appId: string;
      hasSecret: boolean;
      fromEnv: boolean;
      configured: boolean;
      loginType: InstagramLoginType;
      graphVersion: string;
    };
  };
  redirectUris: Record<PlatformId, string>;
  hashtagGroups: HashtagGroup[];
  currency: string;
  monthlyRevenueGoal: number;
  defaults: Settings["defaults"];
  passwordProtected: boolean;
  /** « node » : serveur Node.js (ordinateur ou VPS) ; « php » : hébergement mutualisé. */
  hosting: "node" | "php" | "desktop";
  /** Version ordinateur : dossier où sont stockées les données. */
  dataDir?: string;
  /** URL à appeler régulièrement (service cron externe) pour publier les posts programmés — hébergement PHP. */
  cronUrl?: string | null;
  /**
   * Hébergement multi-espaces : seuls les administrateurs gèrent les applications développeur (communes à tous
   * les espaces). Absent = l'utilisateur peut tout modifier.
   */
  canManageApps?: boolean;
  revenueEstimates?: RevenueEstimates;
  /** Connexion d'une chaîne Twitch possible (application Twitch configurée sur l'hébergement). */
  twitchAvailable?: boolean;
  /** Fichier .env de l'hébergement (administrateurs) : jamais les valeurs, seulement les clés présentes. */
  env?: { found: boolean; location: "outside" | "data" | null; public: boolean; keys: string[] } | null;
}

export type UserRole = "admin" | "member";

/** Utilisateur connecté avec Twitch (version hébergée : un espace par compte Twitch). */
export interface SessionUser {
  id: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
}

export interface SessionInfo {
  authenticated: boolean;
  passwordRequired: boolean;
  /** Première visite sur l'hébergement : installation à terminer (code d'installation + application Twitch). */
  setupRequired: boolean;
  /** password : mot de passe unique (APP_PASSWORD) · twitch : connexion Twitch · none : accès libre. */
  loginMethod?: "password" | "twitch" | "none";
  twitchConfigured?: boolean;
  /** Application Twitch définie dans le fichier .env de l'hébergement. */
  twitchFromEnv?: boolean;
  /** Adresse de retour à déclarer dans l'application Twitch. */
  redirectUri?: string;
  user?: SessionUser | null;
}

export type AccessMode = "owner" | "invite" | "open";

export interface AdminUser extends SessionUser {
  createdAt: number | null;
  lastLoginAt: number | null;
  posts: number;
  accounts: number;
  /** Octets occupés par les vidéos de l'espace. */
  storage: number;
}

export interface AdminOverview {
  access: { mode: AccessMode; allowed: string[] };
  users: AdminUser[];
  twitch: { clientId: string; redirectUri: string; fromEnv?: boolean };
}

/* ------------------------------------------------------------------ */
/* Statistiques                                                        */
/* ------------------------------------------------------------------ */

/** Photo quotidienne des compteurs d'un compte (une par jour et par plateforme). */
export interface AccountSnapshot {
  platform: PlatformId;
  date: string; // AAAA-MM-JJ
  followers: number;
  totalViews?: number;
  totalLikes?: number;
  videoCount?: number;
  demo?: boolean;
}

/** Métriques journalières fournies par les API d'analytics (YouTube Analytics, Instagram Insights). */
export interface DailyMetric {
  platform: PlatformId;
  date: string;
  views?: number;
  watchMinutes?: number;
  followersGained?: number;
  revenue?: number;
  demo?: boolean;
}

export interface SyncState {
  at?: number;
  error?: string;
  revenueAvailable?: boolean;
}

export type AnalyticsRange = 7 | 28 | 90 | 365;

export type SeriesPoint = {
  date: string;
  tiktok?: number;
  youtube?: number;
  instagram?: number;
};

export interface KpiValue {
  value: number;
  previous: number | null;
}

export interface PlatformSummary {
  platform: PlatformId;
  connected: boolean;
  accountName?: string;
  followers: number | null;
  followersDelta: number | null;
  views: number | null;
  likes: number | null;
  videoCount: number | null;
  sync: SyncState;
}

export interface TopPost {
  postId: string;
  title: string;
  posterId?: string;
  publishedAt?: number;
  totalViews: number;
  totalEngagement: number;
  platforms: Partial<Record<PlatformId, PostMetrics & { url?: string }>>;
}

/* ------------------------------------------------------------------ */
/* Audience : genre, âge, pays                                         */
/* ------------------------------------------------------------------ */

export const AGE_BUCKETS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

/** Répartition de l'audience d'une plateforme. Toutes les parts sont des fractions (0 → 1). */
export interface AudienceDemographics {
  platform: PlatformId;
  /** api : YouTube Analytics / Instagram Insights · manual : saisie (TikTok Studio…) · demo : simulée. */
  source: "api" | "manual" | "demo";
  /** followers : abonnés (Instagram, saisie) · viewers : spectateurs des 90 derniers jours (YouTube). */
  basis: "followers" | "viewers";
  updatedAt: number;
  gender?: { female: number; male: number; other: number };
  ages?: Partial<Record<AgeBucket, number>>;
  /** Codes pays ISO 3166-1 alpha-2, du plus représenté au moins représenté. */
  countries?: { code: string; share: number }[];
  cities?: { name: string; share: number }[];
}

/** Totaux des vidéos publiées pendant une période, par plateforme. */
export interface MetricTotals {
  videos: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface AnalyticsSummary {
  range: AnalyticsRange;
  demo: boolean;
  kpis: {
    followers: KpiValue;
    views: KpiValue;
    engagement: KpiValue;
    revenue: KpiValue;
  };
  platforms: PlatformSummary[];
  followersSeries: SeriesPoint[];
  viewsSeries: SeriesPoint[];
  /** Vidéos publiées sur la période (jusqu'à 100), classées par vues cumulées. */
  topPosts: TopPost[];
  engagementRate: number | null;
  /** Totaux des vidéos de la période précédente (évolution du taux d'influence). */
  previousTotals?: Partial<Record<PlatformId, MetricTotals>>;
  audience?: Partial<Record<PlatformId, AudienceDemographics>>;
}

/* ------------------------------------------------------------------ */
/* Revenus                                                             */
/* ------------------------------------------------------------------ */

export const INCOME_CATEGORIES = [
  "sponsorship",
  "ads",
  "creator_fund",
  "affiliate",
  "merch",
  "subscriptions",
  "tips",
  "other_income",
] as const;
export const EXPENSE_CATEGORIES = ["equipment", "software", "freelance", "ads_spend", "travel", "other_expense"] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type RevenueCategory = IncomeCategory | ExpenseCategory;

export interface RevenueEntry {
  id: string;
  kind: "income" | "expense";
  date: string; // AAAA-MM-JJ
  amount: number; // toujours positif, dans la devise des paramètres
  category: RevenueCategory;
  platform?: RevenuePlatform;
  label: string; // ex. « Sponsoring Nike », « Micro Rode »
  partner?: string;
  postId?: string;
  status: "received" | "pending";
  note?: string;
  demo?: boolean;
  /** Ligne calculée automatiquement (revenus YouTube synchronisés, estimations). */
  auto?: boolean;
  /** Montant estimé (RPM, abonnements Twitch…), à remplacer par le montant réel une fois versé. */
  estimated?: boolean;
  createdAt: number;
}

/** Revenus : les trois plateformes de publication, Twitch (lives) et le reste. */
export type RevenuePlatform = PlatformId | "twitch" | "other";

export interface RevenueSummary {
  currency: string;
  monthlyGoal: number;
  from: string;
  to: string;
  totals: {
    income: number;
    expenses: number;
    net: number;
    pending: number;
    incomePrevious: number;
    thisMonth: number;
  };
  byMonth: { month: string; income: Record<string, number>; expenses: number }[];
  byCategory: { category: RevenueCategory; amount: number }[];
  byPlatform: { platform: RevenuePlatform; amount: number }[];
  entries: RevenueEntry[];
  youtubeAdsIncluded: boolean;
  /** Montant estimé inclus dans les revenus de la période. */
  estimatedIncome?: number;
}

/** Chaîne Twitch connectée (abonnés, abonnements payants, bits) — version hébergée. */
export interface TwitchChannelInfo {
  connected: boolean;
  demo?: boolean;
  login?: string;
  displayName?: string;
  avatarUrl?: string | null;
  followers?: number | null;
  subscriptions?: { total: number; tier1: number; tier2: number; tier3: number; points: number } | null;
  bitsThisMonth?: number | null;
  /** Revenu mensuel estimé (abonnements + bits du mois en cours). */
  monthlyEstimate?: number | null;
  updatedAt?: number | null;
  error?: string | null;
}

export interface TiktokCreatorInfo {
  creatorAvatarUrl?: string;
  creatorUsername?: string;
  creatorNickname?: string;
  privacyLevelOptions: TiktokPrivacy[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
}

/** Publication renvoyée par l'API, accompagnée de sa vidéo. */
export interface PostWithMedia extends Post {
  media?: MediaAsset | null;
  images?: MediaAsset[];
}

export type SaveAction = "draft" | "schedule" | "publish";

export interface DashboardData {
  demo: boolean;
  counts: { drafts: number; scheduled: number; publishing: number; published: number; failed: number; thisMonth: number };
  upcoming: PostWithMedia[];
  recent: PostWithMedia[];
  accounts: PublicAccount[];
  audience: { total: number; delta: number | null; series: { date: string; value: number }[] };
  revenue: { thisMonth: number; goal: number; currency: string; lastMonth: number };
  successRate: number | null;
}
