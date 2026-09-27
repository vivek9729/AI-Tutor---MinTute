import { theme, animation } from "/config/ui-config.js";

const root = document.documentElement;
for (const [key, value] of Object.entries(theme.colors)) {
  root.style.setProperty(`--${key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`, value);
}
root.style.setProperty("--radius-card", theme.radii.card);
root.style.setProperty("--radius-bubble", theme.radii.bubble);
root.style.setProperty("--font", theme.font);
if (!animation.enabled) document.body.classList.add("no-motion");

const chatLog = document.getElementById("chatLog");
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const levelSelect = document.getElementById("level");
const modeSelect = document.getElementById("mode");
const clearBtn = document.getElementById("clearBtn");

let history = [];

function addBubble(text, role) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  return div;
}

function scrollToBottom() {
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function checkProvider() {
  const status = document.getElementById("providerStatus");
  try {
    const res = await fetch("/api/providers");
    const data = await res.json();
    status.textContent = `active → ${data.active} (${(data.providers.find(p => p.id === data.active) || {}).label || "custom"})`;
  } catch {
    status.textContent = "server unreachable";
  }
}

// Reads one Server-Sent-Events stream and renders tokens live.
async function renderStream(response, bubble) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;

      let event;
      try {
        event = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }

      if (event.type === "token") {
        fullText += event.token;
        bubble.textContent = fullText;
        scrollToBottom();
      } else if (event.type === "replace") {
        // Guardrail fired (off-topic / drift) — swap the bubble content.
        fullText = event.reply;
        bubble.textContent = fullText;
      } else if (event.type === "error") {
        bubble.textContent = `⚠️ ${event.message}\n${event.detail || ""}`;
      }
      // "done" needs no rendering; the stream simply ends.
    }
  }

  return fullText;
}

// Fallback for older flows / non-streaming servers.
async function renderOnce(response, bubble) {
  const data = await response.json();
  if (data.error) {
    bubble.textContent = `⚠️ ${data.message}\n${data.detail || ""}`;
    return "";
  }
  bubble.textContent = data.reply;
  return data.reply;
}

async function sendMessage(text) {
  addBubble(text, "user");
  history.push({ role: "user", content: text });
  input.value = "";
  sendBtn.disabled = true;

  const bubble = addBubble("…", "bot");
  bubble.classList.add("streaming");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: text,
        mode: modeSelect.value,
        level: levelSelect.value,
        history: history.slice(-8),
        stream: true
      })
    });

    const isStream = (res.headers.get("content-type") || "").includes("text/event-stream");
    const reply = isStream ? await renderStream(res, bubble) : await renderOnce(res, bubble);

    if (reply) history.push({ role: "assistant", content: reply });
  } catch {
    bubble.textContent = "I lost my chalk — the server isn't reachable. Start it with `npm start`.";
  } finally {
    bubble.classList.remove("streaming");
    sendBtn.disabled = false;
    input.focus();
    scrollToBottom();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (text) sendMessage(text);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

clearBtn.addEventListener("click", () => {
  history = [];
  chatLog.innerHTML = "";
  greet();
});

function greet() {
  addBubble(
    "Hello! I'm MinTute 👋 — your slightly funny, very patient CS mentor.\n\n" +
    "Tell me your topic: coding, DSA, system design, debugging, code review, or interview prep.\n" +
    "I'll guide you with hints first — spoon-feeding makes lazy brains! 🥄🙅",
    "bot"
  );
}

greet();
checkProvider();
