export default {
  async fetch(request, env) {

    // quick health check
    if (request.method === "GET") {
      return new Response("☄️ Comet API running");
    }

    try {
      const { message } = await request.json();

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 700,
          messages: [
            { role: "user", content: message }
          ]
        })
      });

      const data = await res.json();

      return new Response(JSON.stringify({
        reply: data.content?.[0]?.text || JSON.stringify(data)
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        reply: "Error: " + err.message
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
