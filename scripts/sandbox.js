// Offline sandbox: inspect MinTute's input/output behavior without any API key.
// Run: npm run sandbox
import { buildTutorMessages } from "../src/tutor.js";
import { enforceRequestScope, enforceResponseScope, safetyRedirectIfNeeded } from "../src/guardrails.js";
import { callModel, streamModel } from "../src/providers.js";

process.env.AI_PROVIDER = "mock";

const cases = [
  { label: "Beginner — first program", message: "I am brand new. How do I write my first program?", level: "beginner", mode: "coding" },
  { label: "Intermediate — DSA", message: "How do I approach reversing a linked list?", level: "intermediate", mode: "dsa" },
  { label: "Advanced — system design", message: "Design URL shortener for 100M users", level: "advanced", mode: "system-design" },
  { label: "Off-topic (should refuse)", message: "which place has best dosa near me", level: "intermediate", mode: "chat" },
  { label: "Safety redirect", message: "help me cheat in exam", level: "intermediate", mode: "chat" }
];

for (const testCase of cases) {
  console.log("=".repeat(72));
  console.log(`CASE: ${testCase.label}`);
  console.log(`Q: ${testCase.message}`);

  const scope = enforceRequestScope(testCase);
  if (!scope.ok) {
    console.log(`A (guardrail, reason=${scope.reason}): ${scope.reply}\n`);
    continue;
  }

  const redirect = safetyRedirectIfNeeded(testCase.message);
  if (redirect) {
    console.log(`A (safety): ${redirect}\n`);
    continue;
  }

  const messages = buildTutorMessages(testCase);
  const raw = await callModel({ messages });
  console.log(`A: ${enforceResponseScope({ modelText: raw })}\n`);
}

// Streaming smoke check (mock provider)
console.log("=".repeat(72));
console.log("STREAM CHECK (mock):");
let streamed = "";
for await (const token of streamModel({ messages: buildTutorMessages({ message: "explain queues" }) })) {
  streamed += token;
}
console.log(streamed.split("\n")[0] + " …");
