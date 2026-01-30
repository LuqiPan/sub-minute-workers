export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }

    // Replace with your real work.
    console.log("runner tick", new Date().toISOString());

    return new Response("ran", { status: 200 });
  },
};
