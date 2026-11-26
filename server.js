const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public"), {
  etag: true,
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));

app.get("/health", (_req, res) => res.json({ ok: true, app: "SecretBrowser" }));

// Optional server-side AI. Without OPENAI_API_KEY, the UI uses a local demo assistant.
// Never put an API key in public JavaScript or HTML.
app.post("/api/assistant", async (req, res) => {
  const message = String(req.body?.message || "").trim().slice(0, 2000);
  if (!message) return res.status(400).json({ error: "Enter a message first." });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.json({
      mode: "demo",
      reply: "Secret AI is in demo mode because no server API key is configured. I can still explain SecretBrowser settings, privacy concepts, cookies, and browser features. For live AI, an administrator can add OPENAI_API_KEY to the Render environment."
    });
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Secret AI, a concise assistant inside SecretBrowser. Explain browser privacy and settings accurately. Do not claim the web app can control the user's whole phone or Safari." },
          { role: "user", content: message }
        ],
        max_tokens: 350
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("AI provider error:", data?.error?.message || upstream.status);
      return res.status(502).json({ error: "The AI provider could not answer. Check the server API configuration." });
    }
    return res.json({ mode: "live", reply: data.choices?.[0]?.message?.content || "No response was returned." });
  } catch (err) {
    console.error("AI request failed:", err.message);
    return res.status(502).json({ error: "Could not reach the AI service." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`SecretBrowser running on port ${PORT}`));
