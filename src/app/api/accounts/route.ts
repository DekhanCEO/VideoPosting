import { listPublicAccounts } from "@/lib/server/accounts";
import { json, route } from "@/lib/server/api";

export const GET = route(async () => json(listPublicAccounts()));
