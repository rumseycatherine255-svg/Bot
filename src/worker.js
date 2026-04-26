import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/api", async (req, res) => {
  const { message, image } = req.body;

  if (!process.env.CLAUDE_API_KEY) {
    return res.json({ reply: "Missing API key in .env" });
  }

  const content = [
    { type: "text", text: message || "" }
  ];

  if (image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: image.split(",")[1]
      }
    });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content
          }
        ]
      })
    });

    const data = await response.json();

    res.json({
      reply: data.content?.[0]?.text || JSON.stringify(data)
    });

  } catch (err) {
    res.json({ reply: "Server error: " + err.message });
  }
});

app.listen(3000, () => {
  console.log("☄️ Comet running on http://localhost:3000");
});
