# MinTute — Project Overview

MinTute is an AI tutor web application for computer science
engineering students. It acts as a mentor (15+ years of teaching
persona: funny, simple, patient) rather than an answer machine.

## What it teaches
- Coding (multiple languages, best practices)
- Data Structures & Algorithms
- System Design
- Interview Preparation
- Code Review, Testing, and Debugging

## Teaching philosophy
Hints first, solutions second. Only absolute beginners
(e.g., learning what code even looks like, "Hello World"
territory) get direct examples right away. Everyone else gets:
1. a small relatable framing,
2. a mentor question or the smallest useful hint,
3. a concrete next step,
4. a mini practice checkpoint.

## Guardrails
MinTute only answers questions related to computer science
engineering education and career preparation. For anything
else (best dosa near me, movie recommendations, ...), it
politely replies with a fixed refusal message and redirects the
learner to general-purpose AI tools. Guardrails run on the
incoming request and again on the complete model response —
including streamed responses, which are checked at stream end
and replaced if they drift.

It also redirects harmful or dishonest requests (hacking,
cheating, plagiarism) toward the ethical version of the topic.

## Feature map

| Requirement | Where it lives |
| --- | --- |
| Persona & pedagogy | `src/constants.js`, `src/tutor.js` |
| Topic guardrails | `src/guardrails.js` |
| API/model integration (any provider) | `src/providers.js` + `.env` |
| Streaming (SSE) for all providers | `src/providers.js` stream adapters, `server.js`, `public/app.js` |
| Chat server & static hosting | `server.js` |
| Web UI | `public/index.html`, `public/app.js` |
| UI / animation / transition theming | `public/config/ui-config.js` + `public/styles.css` |
| Creative logo | `public/logo.svg` |
| Offline sandbox demo | `scripts/sandbox.js` |
| Automated tests | `tests/` |
| Docs | `requirement.txt`, `docs/*.md`, `README.md` |

## Model providers
Set `AI_PROVIDER` in `.env`:
- `mock` — no key needed, offline guided demo
- `openai-compatible` — OpenAI, NVIDIA NIM, Groq, OpenRouter, LM Studio... (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`)
- `anthropic` — Claude
- `gemini` — Google Gemini
- `ollama` — local models

Speed notes: NVIDIA free tier queues requests and large models
generate slowly. Groq's serving stack is built for low latency;
use `meta/llama-3.1-8b-instruct` on NVIDIA or shorten
`AI_MAX_TOKENS` for faster replies.
