import test from "node:test";
import assert from "node:assert/strict";
import { buildTutorMessages, normalizeHistory, quickFeedback } from "../src/tutor.js";
import { OFF_TOPIC_REPLY } from "../src/constants.js";

test("system prompt enforces mentor persona and scope", () => {
  const messages = buildTutorMessages({ message: "teach me recursion", mode: "dsa", level: "intermediate" });
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  assert.match(system, /MinTute/);
  assert.match(system, /not an answer vending machine/i);
  assert.ok(system.includes(OFF_TOPIC_REPLY));
});

test("level and mode directives are injected", () => {
  const messages = buildTutorMessages({ message: "hello", mode: "system-design", level: "advanced" });
  const context = messages[1].content;
  assert.match(context, /advanced/i);
  assert.match(context, /system design/i);
});

test("unknown mode/level fall back safely", () => {
  const messages = buildTutorMessages({ message: "hi", mode: "hack", level: "wizard" });
  assert.match(messages[1].content, /intermediate/i);
  assert.match(messages[1].content, /general computer science tutoring/i);
});

test("history is trimmed and sanitized", () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x".repeat(4000) }));
  const normalized = normalizeHistory(history);
  assert.equal(normalized.length, 12);
  assert.ok(normalized.every((m) => m.content.length <= 3000));
  assert.ok(normalized.every((m) => ["user", "assistant"].includes(m.role)));
});

test("quickFeedback flags short non-teaching replies", () => {
  assert.equal(quickFeedback("ok").lengthOk, false);
  assert.equal(quickFeedback("Try this step: draw the base case first.").mentorTone, true);
});
