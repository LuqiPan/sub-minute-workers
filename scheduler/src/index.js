export default {
  async scheduled(_controller, env) {
    console.log("scheduler cron tick", new Date().toISOString());
    await env.RUNNER.fetch("https://runner/run", { method: "POST" });
  },
  async fetch(_request, env) {
    // Manual trigger fallback for ad-hoc verification.
    await env.RUNNER.fetch("https://runner/run", { method: "POST" });
    return new Response("scheduled runner invoked", { status: 200 });
  },
};
