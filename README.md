# 🎓 MinTute — AI Tutor for CSE Students

MinTute is a mentor-style AI tutor for computer science
engineering students: coding, DSA, system design, and interview
preparation — taught with humor, simplicity, and patience.

## ✨ Features
- 🧑‍🏫 **Mentor persona** — 15+ years of teaching experience; funny, simple explanations a 10-year-old could follow.
- 🚫 **No spoon-feeding** — hints and guided steps first; full solutions only when truly needed (e.g., a beginner's first Hello World).
- 🎯 **Levels & modes** — beginner / intermediate / advanced × coding, DSA, system design, interview prep, code review, debugging, testing.
- 🛡️ **Strict guardrails** — answers only computer science topics; off-topic asks get a polite fixed refusal (checked on request AND response).
- ⚡ **Streaming replies** — words appear live as the model thinks (Server-Sent Events), with a blinking caret.
- 🔌 **Any AI model** — OpenAI-compatible (OpenAI, NVIDIA NIM, Groq, OpenRouter, LM Studio), Anthropic, Gemini, or local Ollama; offline `mock` provider needs no key.
- 🎨 **Themeable UI/animations** — one config file: `public/config/ui-config.js`.
- 🧪 **Sandbox & tests included.**

## 🚀 Run locally
```bash
# Node.js 18.18+ required. No npm install needed (zero dependencies).
cp .env.example .env   # optional; default is the offline mock provider
npm start
# open http://localhost:3000
```

## 🔑 Connect a real AI model
Edit `.env`. Examples:

**Groq (fastest free tier)**
```env
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
AI_API_KEY=gsk_your_key_here
```

**NVIDIA NIM**
```env
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://integrate.api.nvidia.com/v1
AI_MODEL=meta/llama-3.1-70b-instruct
AI_API_KEY=nvapi_your_key_here
```

Also available: `anthropic`, `gemini`, `ollama` — see `.env.example`.
Tip: lower `AI_MAX_TOKENS` (e.g. 500) for shorter, faster replies.

## 🧫 Sandbox (test input/output without a key)
```bash
npm run sandbox
```

## 🧪 Tests
```bash
npm test
```

## 🎨 Customize UI / animations
Open `public/config/ui-config.js` — change colors, radii, and
motion in one place; save and refresh. No build step.

## 📦 Deploy
Any Node host works:
```bash
PORT=8080 npm start
```


## 📁 Structure
```
server.js            HTTP server (API, SSE streaming, static files)
src/
  constants.js       MinTute persona & system prompt
  guardrails.js      CSE-only scope enforcement (request + response)
  tutor.js           Message building per level/mode
  providers.js       Multi-provider adapters: full + streaming
  env.js             .env loading (no dependencies)
public/
  index.html app.js styles.css logo.svg
  config/ui-config.js   ← theme & animation control
scripts/sandbox.js   Offline demo
tests/               node:test unit tests
docs/                Planning & architecture docs
requirement.txt      SRS
```

> Final year project. Original code. Contributions welcome.
