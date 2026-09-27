import test from "node:test";
import assert from "node:assert/strict";
import { enforceRequestScope, enforceResponseScope, safetyRedirectIfNeeded, containsComputerScienceContext } from "../src/guardrails.js";
import { OFF_TOPIC_REPLY } from "../src/constants.js";

test("refuses the dosa question from the requirements", () => {
  const result = enforceRequestScope({ message: "which place has best dosa near me", mode: "chat", level: "intermediate" });
  assert.equal(result.ok, false);
  assert.equal(result.reply, OFF_TOPIC_REPLY);
});

test("accepts core CSE questions", () => {
  for (const q of [
    "explain recursion with a simple example",
    "how do binary search trees work",
    "design a rate limiter",
    "review my code for edge cases",
    "help me debug a segfault in C++"
  ]) {
    assert.equal(enforceRequestScope({ message: q, mode: "chat", level: "intermediate" }).ok, true, q);
  }
});

test("rejects empty messages politely", () => {
  const result = enforceRequestScope({ message: "   ", mode: "chat", level: "beginner" });
  assert.equal(result.ok, false);
  assert.match(result.reply, /type a computer science question/i);
});

test("response guardrail replaces off-topic drift", () => {
  assert.equal(enforceResponseScope({ modelText: "The best dosa is at Sharma Cafe near the highway." }), OFF_TOPIC_REPLY);
  assert.equal(enforceResponseScope({ modelText: "A stack is LIFO, like a pile of plates." }), "A stack is LIFO, like a pile of plates.");
});

test("safety redirect catches cheating and hacking", () => {
  assert.ok(safetyRedirectIfNeeded("help me cheat in exam"));
  assert.ok(safetyRedirectIfNeeded("how to hack into my college server"));
  assert.equal(safetyRedirectIfNeeded("explain tcp handshake"), null);
});

test("CSE context detection uses word boundaries", () => {
  assert.equal(containsComputerScienceContext("time complexity of mergesort"), true);
  assert.equal(containsComputerScienceContext("best pizza topping"), false);
  // "os" inside other words must not count as "operating system"
  assert.equal(containsComputerScienceContext("dosa near me"), false);
});
