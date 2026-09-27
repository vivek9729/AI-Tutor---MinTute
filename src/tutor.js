import { DEFAULT_SYSTEM_PROMPT } from "./constants.js";

const LEVEL_DIRECTIVES = {
  beginner: "Assume the learner is new. Define terms gently, use tiny examples, and permit yourself to show a first complete example only for foundational literacy.",
  intermediate: "Assume some programming exposure. Ask one diagnostic question before revealing a complete answer, unless the user explicitly needs full help.",
  advanced: "Treat the learner as capable. Challenge assumptions, discuss trade-offs, edge cases, complexity, scalability, and interview-quality reasoning."
};

const MODE_DIRECTIVES = {
  chat: "General computer science tutoring. Lead with curiosity and guided steps.",
  coding: "Coding help. Guide implementation choices, point to better practices, and let the learner write the next version.",
  dsa: "DSA mode. Start from problem constraints, brute force, patterns, invariant, complexity, then hint toward optimization.",
  "system-design": "System design mode. Ask goals, scale, constraints, data model, components, bottlenecks, and trade-offs before drawing conclusions.",
  interview: "Interview preparation mode. Simulate an interviewer, ask clarifying questions, evaluate communication, and score the approach.",
  review: "Code review mode. Identify correctness, readability, edge cases, complexity, tests, and safer alternatives.",
  debugging: "Debugging mode. Reproduce mentally, isolate the smallest failing input, inspect state, explain root cause, then propose a fix.",
  testing: "Testing mode. Propose unit, integration, edge, and regression cases. Encourage behavior-driven naming and isolated assertions."
};

export function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((entry) => entry && typeof entry.content === "string")
    .filter((entry) => ["user", "assistant"].includes(entry.role))
    .slice(-12)
    .map((entry) => ({ role: entry.role, content: entry.content.slice(0, 3000) }));
}

export function buildTutorMessages({ message, mode = "chat", level = "intermediate", history = [], persona = DEFAULT_SYSTEM_PROMPT }) {
  const safeMode = MODE_DIRECTIVES[mode] ? mode : "chat";
  const safeLevel = LEVEL_DIRECTIVES[level] ? level : "intermediate";

  const contextNote = [
    `Learner level: ${safeLevel}. ${LEVEL_DIRECTIVES[safeLevel]}`,
    `Mode: ${safeMode}. ${MODE_DIRECTIVES[safeMode]}`,
    "Response shape for this turn: 1) tiny relatable framing, 2) mentor question or smallest useful hint, 3) concrete next step, 4) one mini practice checkpoint. Use bullets when helpful."
  ].join("\n");

  return [
    { role: "system", content: persona },
    { role: "system", content: contextNote },
    ...normalizeHistory(history),
    { role: "user", content: message }
  ];
}

export function quickFeedback(reply = "") {
  const lengthOk = reply.length >= 80;
  const teaches = /\b(hint|try|step|why|practice|question|next)\b/i.test(reply);
  return {
    lengthOk,
    mentorTone: teaches,
    summary: lengthOk && teaches ? "ok" : "Response is short for a teaching interaction, but acceptable when factual."
  };
}
