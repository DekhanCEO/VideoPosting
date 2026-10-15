export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureScheduler } = await import("./lib/server/scheduler");
    ensureScheduler();
  }
}
