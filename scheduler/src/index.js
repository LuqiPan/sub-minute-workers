import { DurableObject } from "cloudflare:workers";

const INTERVAL_MS = 20_000;
const RUNS_PER_CRON = 2;

async function startTicker(env, runKey) {
  const stub = env.TICKER.getByName(runKey);
  const resp = await stub.fetch("https://ticker/start", { method: "POST" });
  await resp.text();
}

export default {
  async scheduled(controller, env, ctx) {
    console.log("scheduler cron tick", new Date().toISOString());
    const runKey = `cron-${controller.scheduledTime}`;
    ctx.waitUntil(startTicker(env, runKey));
  },
  async fetch(_request, env, ctx) {
    const runKey = `manual-${Date.now()}`;
    ctx.waitUntil(startTicker(env, runKey));
    return new Response("durable-object ticker queued", { status: 202 });
  },
};

export class Ticker extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }

  async runRunner() {
    const resp = await this.env.RUNNER.fetch("https://runner/run", {
      method: "POST",
    });
    await resp.text();
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/start") {
      return new Response("not found", { status: 404 });
    }

    const started = await this.ctx.storage.get("started");
    if (started) {
      return new Response("already started", { status: 200 });
    }

    await this.ctx.storage.put("started", true);
    await this.ctx.storage.put("remaining", RUNS_PER_CRON);
    await this.ctx.storage.setAlarm(Date.now() + INTERVAL_MS);
    await this.runRunner();

    return new Response("started", { status: 200 });
  }

  async alarm() {
    const remaining = (await this.ctx.storage.get("remaining")) ?? 0;
    if (remaining <= 0) {
      return;
    }

    await this.runRunner();

    const nextRemaining = remaining - 1;
    await this.ctx.storage.put("remaining", nextRemaining);
    if (nextRemaining > 0) {
      await this.ctx.storage.setAlarm(Date.now() + INTERVAL_MS);
    } else {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
    }
  }
}
