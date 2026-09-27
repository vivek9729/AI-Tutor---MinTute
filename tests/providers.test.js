import test from "node:test";
import assert from "node:assert/strict";
import { availableProviders, callModel, streamModel } from "../src/providers.js";

test("mock provider answers without a key", async () => {
  const env = { AI_PROVIDER: "mock" };
  const reply = await callModel({
    env,
    messages: [{ role: "user", content: "explain queues" }]
  });
  assert.match(reply, /Mentor path/i);
});

test("mock provider streams tokens", async () => {
  const env = { AI_PROVIDER: "mock" };
  let streamed = "";
  let tokenCount = 0;
  for await (const token of streamModel({
    env,
    messages: [{ role: "user", content: "explain queues" }]
  })) {
    streamed += token;
    tokenCount++;
    if (tokenCount > 40) break; // enough proof it streams
  }
  assert.ok(tokenCount > 3, "should yield multiple tokens");
  assert.ok(streamed.length > 30, "streamed text should build the reply");
});

test("provider list exposes all integration options", () => {
  const { providers } = availableProviders();
  const ids = providers.map((p) => p.id);
  assert.ok(ids.includes("mock"));
  assert.ok(ids.includes("openai-compatible"));
  assert.ok(ids.includes("anthropic"));
  assert.ok(ids.includes("gemini"));
  assert.ok(ids.includes("ollama"));
});

test("unknown provider errors clearly", async () => {
  await assert.rejects(
    () => callModel({ env: { AI_PROVIDER: "skynet" }, messages: [] }),
    /Unsupported AI_PROVIDER/
  );
});
