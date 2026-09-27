import { OFF_TOPIC_REPLY } from "./constants.js";

const CSE_KEYWORDS = [
  "computer", "coding", "program", "code", "debug", "compiler", "algorithm", "data structure",
  "dsa", "array", "linked list", "stack", "queue", "tree", "graph", "heap", "hash", "sorting",
  "searching", "dynamic programming", "recursion", "system design", "architecture", "scalability",
  "database", "dbms", "sql", "nosql", "operating system", "os", "process", "thread", "deadlock",
  "computer network", "network", "tcp", "udp", "http", "api", "backend", "frontend", "javascript",
  "python", "java", "c++", "c#", "golang", "rust", "interview", "leetcode", "code review",
  "testing", "unit test", "software engineering", "distributed system", "cache", "load balancer",
  "complexity", "time complexity", "space complexity", "big o", "binary search", "machine coding",
  "object oriented", "oop", "devops", "cloud", "microservice", "security"
];

const CLEAR_NON_CSE_PATTERNS = [
  /\bbest\s+dosa\b/i,
  /\brestaurant(s)?\s+near/i,
  /\bmovie(s)?\b/i,
  /\bweather\b/i,
  /\bcricket|football|ipl\b/i,
  /\bstock\s+(market|price)|share\s+price\b/i,
  /\bmedical|doctor|symptom\b/i,
  /\bpolitic(s|ian)|election\b/i,
  /\btravel|hotel|flight\b/i,
  /\bcelebrit(y|ies)\b/i,
  /\brecipe|cooking\b/i,
  /\blocation|near\s+me\b/i,
  /\bremember\s+me\b/i,
  /\bsine\s+value\s+of\b/i
];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-like keywords use real word boundaries so "os" inside "dosa"
// never counts as "operating system". Symbol-heavy keywords (c++, c#)
// fall back to plain substring matching.
export function containsComputerScienceContext(text = "") {
  const lower = text.toLowerCase();
  return CSE_KEYWORDS.some((word) => {
    if (/^[a-z0-9][a-z0-9 ]*[a-z0-9]$|^[a-z0-9]$/.test(word)) {
      return new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(lower);
    }
    return lower.includes(word);
  });
}

export function isClearlyOffTopic(text = "") {
  return CLEAR_NON_CSE_PATTERNS.some((pattern) => pattern.test(text));
}

export function enforceRequestScope({ message = "", mode = "chat", level = "intermediate" }) {
  const clean = message.trim();

  if (!clean) {
    return {
      ok: false,
      reason: "empty-message",
      reply: "Please type a computer science question first. Even tutors need raw material."
    };
  }

  // Mode buttons already tell us intent, so be friendly but still stop direct non-CSE asks.
  if (isClearlyOffTopic(clean) && !containsComputerScienceContext(clean)) {
    return { ok: false, reason: "off-topic", reply: OFF_TOPIC_REPLY };
  }

  // Strict behavior for plain chat: require either a CSE hint or a studious framing.
  const hasLearningIntent = /\b(learn|teach|practice|explain|question|problem|task|review|fix|test)\b/i.test(clean);
  if (mode === "chat" && !containsComputerScienceContext(clean) && !hasLearningIntent && level === "advanced") {
    return { ok: false, reason: "unclear-scope", reply: OFF_TOPIC_REPLY };
  }

  return { ok: true };
}

export function enforceResponseScope({ modelText = "" }) {
  const text = String(modelText || "").trim();
  if (!text) return OFF_TOPIC_REPLY;

  // A model can drift after jailbreak-ish requests. Catch obvious drift and reset scope.
  if (isClearlyOffTopic(text) && !containsComputerScienceContext(text) && !text.toLowerCase().includes("sorry i am a ai tutor")) {
    return OFF_TOPIC_REPLY;
  }

  return text;
}

export function safetyRedirectIfNeeded(text = "") {
  const unsafe = /\b(hack\s+into|steal\s+password|bypass\s+authentication|write\s+malware|cheat\s+in\s+exam|plagiarize)\b/i;
  if (unsafe.test(text)) {
    return "I can’t help with harmful or dishonest activity. I can teach the ethical version: secure coding, authentication concepts, common vulnerabilities, and how engineers defend systems.";
  }
  return null;
}
