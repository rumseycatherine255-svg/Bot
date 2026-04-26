export default {
  async fetch(request, env) {

    console.log("🔥 HIT WORKER:", request.method);

    // Always respond to GET so we KNOW it's alive
    if (request.method === "GET") {
      return new Response("☄️ Comet Worker Alive");
    }

    try {
      const body = await request.json();
      console.log("📩 BODY:", body);

      if (!body.message) {
        return new Response(JSON.stringify({
          error: "No message received"
        }));
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 500,
          messages: [
            { role: "user", content: body.message }
          ]
        })
      });

      const data = await res.json();

      console.log("🤖 CLAUDE RESPONSE:", data);

      return new Response(JSON.stringify({
        reply: data.content?.[0]?.text || JSON.stringify(data)
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (err) {
      console.log("❌ ERROR:", err);

      return new Response(JSON.stringify({
        error: err.message
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
