export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/start") {
      const id = env.TICKER.idFromName("global");
      const stub = env.TICKER.get(id);
      return stub.fetch("https://ticker/start");
    }

    if (url.pathname === "/stop") {
      const id = env.TICKER.idFromName("global");
      const stub = env.TICKER.get(id);
      return stub.fetch("https://ticker/stop");
    }

    return new Response("ok", { status: 200 });
  },
};

export class Ticker {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/start") {
      await this.state.storage.put("enabled", true);
      const alarm = await this.state.storage.getAlarm();
      if (!alarm) {
        await this.state.storage.setAlarm(Date.now() + 5000);
      }
      return new Response("started", { status: 200 });
    }

    if (url.pathname === "/stop") {
      await this.state.storage.put("enabled", false);
      await this.state.storage.deleteAlarm();
      return new Response("stopped", { status: 200 });
    }

    return new Response("not found", { status: 404 });
  }

  async alarm() {
    const enabled = await this.state.storage.get("enabled");
    if (!enabled) return;

    try {
      await this.env.RUNNER.fetch("https://runner/run", { method: "POST" });
    } finally {
      await this.state.storage.setAlarm(Date.now() + 5000);
    }
  }
}
