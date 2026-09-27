import { runtimeEnv, required } from "./env.js";

const jsonFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });

  const bodyText = await response.text();
  let data;
  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    data = { raw: bodyText };
  }

  if (!response.ok) {
    const detail = data?.error?.message || data?.message || data?.raw || response.statusText;
    throw new Error(`Provider request failed (${response.status}): ${detail}`);
  }

  return data;
};

const providerError = async (response) => {
  let detail = response.statusText;
  try {
    const data = await response.json();
    detail = data?.error?.message || data?.message || detail;
  } catch {
    // response was not JSON; keep the status text
  }
  throw new Error(`Provider stream failed (${response.status}): ${detail}`);
};

// ---------- non-streaming (used for tests / quick checks) ----------

const mockReply = ({ messages }) => {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "your topic";
  return [
    "Great — let's make this learnable instead of mysterious.",
    "",
    `You asked about: "${lastUser.slice(0, 140)}"`,
    "",
    "Mentor path:",
    "1. First, tell me what you already know or what you tried.",
    "2. I will give you a hint before a full solution, unless this is your very first day.",
    "3. Then we test the idea with one tiny example, like using a magnifying glass on an ant — small, but revealing.",
    "",
    "Connect a real API key in .env to replace this offline demo reply with live model output."
  ].join("\n");
};

const openAICompatible = async ({ env, messages }) => {
  const baseUrl = env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = env.AI_MODEL || "gpt-4o-mini";
  const data = await jsonFetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${required("AI_API_KEY", env)}` },
    body: JSON.stringify({ model, messages, temperature: Number(env.AI_TEMPERATURE || 0.4) })
  });
  return data.choices?.[0]?.message?.content || "";
};

const anthropic = async ({ env, messages }) => {
  const model = env.AI_MODEL || "claude-3-5-haiku-latest";
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const chat = messages.filter((m) => m.role !== "system");
  const data = await jsonFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": required("AI_API_KEY", env),
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: Number(env.AI_MAX_TOKENS || 900),
      system,
      messages: chat
    })
  });
  return data.content?.map((part) => part.text || "").join("\n") || "";
};

const gemini = async ({ env, messages }) => {
  const model = env.AI_MODEL || "gemini-1.5-flash";
  const prompt = messages.map((m) => `${m.role.toUpperCase()}:\n${m.content}`).join("\n\n");
  const key = required("AI_API_KEY", env);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const data = await jsonFetch(url, {
    method: "POST",
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
};

const ollama = async ({ env, messages }) => {
  const baseUrl = env.AI_BASE_URL || "http://localhost:11434";
  const model = env.AI_MODEL || "llama3.1";
  const data = await jsonFetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ model, messages, stream: false })
  });
  return data.message?.content || "";
};

// ---------- streaming (async generators yielding text tokens) ----------

// Parses "data: <json>" Server-Sent-Event lines from a streaming fetch body.
async function* readSseLines(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineAt;
    while ((newlineAt = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineAt).trim();
      buffer = buffer.slice(newlineAt + 1);
      if (line.startsWith("data:")) {
        yield line.slice(5).trim();
      }
    }
  }
}

async function* streamMock({ messages }) {
  const text = mockReply({ messages });
  for (const word of text.split(/(\s+)/)) {
    if (word) {
      yield word;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }
}

async function* streamOpenAICompatible({ env, messages }) {
  const baseUrl = env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = env.AI_MODEL || "gpt-4o-mini";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${required("AI_API_KEY", env)}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: Number(env.AI_TEMPERATURE || 0.4),
      max_tokens: Number(env.AI_MAX_TOKENS || 900),
      stream: true
    })
  });

  if (!response.ok) await providerError(response);

  for await (const payload of readSseLines(response)) {
    if (payload === "[DONE]") return;
    try {
      const data = JSON.parse(payload);
      const token = data.choices?.[0]?.delta?.content;
      if (token) yield token;
    } catch {
      // keepalive / partial line — skip
    }
  }
}

async function* streamAnthropic({ env, messages }) {
  const model = env.AI_MODEL || "claude-3-5-haiku-latest";
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const chat = messages.filter((m) => m.role !== "system");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": required("AI_API_KEY", env),
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: Number(env.AI_MAX_TOKENS || 900),
      system,
      messages: chat,
      stream: true
    })
  });

  if (!response.ok) await providerError(response);

  for await (const payload of readSseLines(response)) {
    try {
      const data = JSON.parse(payload);
      if (data.type === "content_block_delta" && data.delta?.text) yield data.delta.text;
      if (data.type === "message_stop") return;
    } catch {
      // skip
    }
  }
}

async function* streamGemini({ env, messages }) {
  const model = env.AI_MODEL || "gemini-1.5-flash";
  const prompt = messages.map((m) => `${m.role.toUpperCase()}:\n${m.content}`).join("\n\n");
  const key = required("AI_API_KEY", env);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!response.ok) await providerError(response);

  for await (const payload of readSseLines(response)) {
    try {
      const data = JSON.parse(payload);
      const token = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
      if (token) yield token;
    } catch {
      // skip
    }
  }
}

async function* streamOllama({ env, messages }) {
  const baseUrl = env.AI_BASE_URL || "http://localhost:11434";
  const model = env.AI_MODEL || "llama3.1";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true })
  });

  if (!response.ok) await providerError(response);

  // Ollama streams newline-delimited JSON (not SSE)
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineAt;
    while ((newlineAt = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineAt).trim();
      buffer = buffer.slice(newlineAt + 1);
      if (!line) continue;
      try {
        const data = JSON.parse(line);
        if (data.message?.content) yield data.message.content;
        if (data.done) return;
      } catch {
        // skip partial JSON
      }
    }
  }
}

// ---------- public API ----------

export function availableProviders() {
  const env = runtimeEnv();
  return {
    active: env.AI_PROVIDER || "mock",
    providers: [
      { id: "mock", label: "Offline demo", needsKey: false, note: "No external call; gives guided mentor template." },
      { id: "openai-compatible", label: "OpenAI-compatible", needsKey: true, note: "OpenAI, NVIDIA NIM, Groq, OpenRouter, Together, LM Studio, etc." },
      { id: "anthropic", label: "Anthropic", needsKey: true },
      { id: "gemini", label: "Google Gemini", needsKey: true },
      { id: "ollama", label: "Local Ollama", needsKey: false }
    ]
  };
}

function resolveAdapters(provider) {
  const streamAdapters = {
    mock: streamMock,
    "openai-compatible": streamOpenAICompatible,
    openai: streamOpenAICompatible,
    groq: streamOpenAICompatible,
    openrouter: streamOpenAICompatible,
    nvidia: streamOpenAICompatible,
    anthropic: streamAnthropic,
    gemini: streamGemini,
    ollama: streamOllama
  };

  const fullAdapters = {
    mock: async ({ messages }) => mockReply({ messages }),
    "openai-compatible": openAICompatible,
    openai: openAICompatible,
    groq: openAICompatible,
    openrouter: openAICompatible,
    nvidia: openAICompatible,
    anthropic,
    gemini,
    ollama
  };

  return {
    stream: streamAdapters[provider],
    full: fullAdapters[provider]
  };
}

export async function callModel({ messages, env = runtimeEnv() }) {
  const provider = (env.AI_PROVIDER || "mock").toLowerCase();
  const adapters = resolveAdapters(provider);
  if (!adapters.full) {
    throw new Error(`Unsupported AI_PROVIDER "${provider}". Use mock, openai-compatible, anthropic, gemini, or ollama.`);
  }
  return adapters.full({ env, messages });
}

export async function* streamModel({ messages, env = runtimeEnv() }) {
  const provider = (env.AI_PROVIDER || "mock").toLowerCase();
  const adapters = resolveAdapters(provider);
  if (!adapters.stream) {
    throw new Error(`Unsupported AI_PROVIDER "${provider}". Use mock, openai-compatible, anthropic, gemini, or ollama.`);
  }
  yield* adapters.stream({ env, messages });
}
