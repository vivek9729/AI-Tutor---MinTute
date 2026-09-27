# Architecture

```
Browser (public/)
  index.html ─ styles.css ─ app.js ─ config/ui-config.js
        │ POST /api/chat { message, mode, level, history, stream }
        ▼
server.js (Node stdlib http)
        ├─► src/guardrails.js   request scope check  ──off-topic──► fixed refusal
        ├─► src/tutor.js        persona + level/mode prompt build
        ├─► src/providers.js    mock | openai-compatible (OpenAI/NVIDIA/Groq/...) 
        │                       | anthropic | gemini | ollama
        │     └─ stream mode → server writes Server-Sent Events per token
        └─► src/guardrails.js   response scope check  ──drift──────► replace event
```

## Design decisions
1. **Zero runtime dependencies** — the app runs with bare Node 18;
   nothing to audit, nothing to break, deploys anywhere.
2. **Guardrails at both edges** — we check the incoming message and
   the model's output, because prompts alone can be jailbroken.
   Streaming replies are token-checked after the stream completes;
   drift triggers an SSE `replace` event.
3. **Streaming everywhere** — every provider has a streaming adapter
   (SSE parse for OpenAI/Anthropic/Gemini, NDJSON for Ollama) so the
   UI types answers live like ChatGPT, even on slow providers.
4. **Pedagogy is data** — level and mode directives are plain
   objects (`src/tutor.js`), easy to extend for new modes.
5. **Provider adapters** — each vendor is one small function; adding
   a provider never touches the rest of the system.
6. **Theming without logic edits** — `ui-config.js` feeds CSS
   variables; designers never open app logic.

## Data flow
1. User types a message; frontend sends JSON to `/api/chat` with
   `stream: true`.
2. Guardrail: off-topic → canned refusal over SSE, no model call.
3. Tutor builds messages: persona system prompt + level/mode
   directives + trimmed history + user message.
4. Provider adapter streams tokens from the configured model API.
5. Server relays tokens as SSE; post-stream guardrail may send a
   `replace` event; client renders progressively.

## Security
- API keys exist only in `.env` / server environment, never in
  client code or git.
- Static serving is path-traversal protected.
- Request body capped at 512 KB.
