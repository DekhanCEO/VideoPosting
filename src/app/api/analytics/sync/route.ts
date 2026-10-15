import { syncAnalytics } from "@/lib/server/analytics";
import { json, route } from "@/lib/server/api";

export const POST = route(async () => json({ reports: await syncAnalytics() }));
