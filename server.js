import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTutorMessages, quickFeedback } from "./src/tutor.js";
import { enforceRequestScope, enforceResponseScope, safetyRedirectIfNeeded } from "./src/guardrails.js";
import { callModel, streamModel, availableProviders } from "./src/providers.js";
import { runtimeEnv } from "./src/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json"
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function sseEvent(res, type, data) {
  res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 512 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let filePath = path.normalize(path.join(PUBLIC_DIR, url.pathname));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (url.pathname === "/") filePath = path.join(PUBLIC_DIR, "index.html");

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { "content-type": MIME_TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

// Guardrails always run BEFORE the model and AFTER the full reply,
// in both streaming and non-streaming modes.
function checkRequest(body) {
  const { message, mode = "chat", level = "intermediate" } = body;

  const scope = enforceRequestScope({ message, mode, level });
  if (!scope.ok) return { blocked: true, reply: scope.reply };

  const redirect = safetyRedirectIfNeeded(message || "");
  if (redirect) return { blocked: true, reply: redirect };

  return { blocked: false };
}

async function handleChatStream(req, res, body) {
  const { message, mode = "chat", level = "intermediate", history = [] } = body;

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache",
    connection: "keep-alive"
  });

  try {
    const messages = buildTutorMessages({ message, mode, level, history });
    const env = runtimeEnv();

    let full = "";
    for await (const token of streamModel({ messages, env })) {
      full += token;
      sseEvent(res, "token", { token });
    }

    // Post-check the complete reply; drift gets replaced instead of half-shown later.
    const finalReply = enforceResponseScope({ modelText: full });
    if (finalReply !== full) {
      sseEvent(res, "replace", { reply: finalReply });
      full = finalReply;
    }

    sseEvent(res, "done", { quality: quickFeedback(full), mode, level });
    res.end();
  } catch (error) {
    sseEvent(res, "error", {
      message: "The AI provider could not answer right now. Check the provider settings in .env, or switch AI_PROVIDER=mock for an offline demo.",
      detail: error.message
    });
    res.end();
  }
}

async function handleChat(req, res) {
  const body = await readBody(req);
  const { message, mode = "chat", level = "intermediate", history = [] } = body;

  const check = checkRequest(body);
  if (check.blocked) {
    if (body.stream) {
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        connection: "keep-alive"
      });
      sseEvent(res, "replace", { reply: check.reply });
      sseEvent(res, "done", { mode, level });
      return res.end();
    }
    return sendJson(res, 200, { reply: check.reply, scoped: true });
  }

  if (body.stream) return handleChatStream(req, res, body);

  try {
    const messages = buildTutorMessages({ message, mode, level, history });
    const rawReply = await callModel({ messages, env: runtimeEnv() });
    const reply = enforceResponseScope({ modelText: rawReply });

    return sendJson(res, 200, {
      reply,
      scoped: true,
      quality: quickFeedback(reply),
      mode,
      level
    });
  } catch (error) {
    return sendJson(res, 502, {
      error: "model_unavailable",
      message: "The AI provider could not answer right now. Check the provider settings in .env, or switch AI_PROVIDER=mock for an offline demo.",
      detail: error.message
    });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/chat") return await handleChat(req, res);
    if (req.method === "GET" && req.url === "/api/health") {
      return sendJson(res, 200, { status: "ok", tutor: "MinTute", time: new Date().toISOString() });
    }
    if (req.method === "GET" && req.url === "/api/providers") return sendJson(res, 200, availableProviders());
    if (req.method === "GET") return serveStatic(req, res);
    res.writeHead(405, { "content-type": "text/plain" });
    res.end("Method not allowed");
  } catch (error) {
    sendJson(res, 400, { error: "bad_request", message: error.message });
  }
});

const env = runtimeEnv();
const port = Number(env.PORT || 3000);
server.listen(port, () => {
  console.log(`MinTute is teaching at http://localhost:${port} (streaming enabled)`);
});
