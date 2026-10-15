export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Tests d'intégration uniquement : redirige les appels aux plateformes vers un serveur simulé.
    const mock = process.env.VP_API_MOCK_BASE;
    if (mock) {
      const original = globalThis.fetch;
      globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const m = url.match(/^https:\/\/([^/]+)(\/.*)?$/);
        return original(m ? `${mock.replace(/\/$/, "")}/${m[1]}${m[2] ?? "/"}` : input, init);
      }) as typeof fetch;
    }
    const { ensureScheduler } = await import("./lib/server/scheduler");
    ensureScheduler();
  }
}
