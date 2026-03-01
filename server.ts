import express from "express";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
    "X-Title": "AI Debate Club",
  },
});

// API Routes
app.get("/api/models", async (req, res) => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching models:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { model, messages, stream = true, max_tokens = 1000 } = req.body;

  try {
    if (stream) {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        stream: true,
        max_tokens,
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        max_tokens,
      });
      res.json(completion.choices[0].message);
    }
  } catch (error: any) {
    console.error("Chat error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      model: model
    });
    res.status(error.status || 500).json({ 
      error: error.message || "Failed to generate response",
      code: error.code
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
