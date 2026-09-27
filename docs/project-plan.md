# Project Plan (SDLC)

## 1. Requirements
Captured in `requirement.txt` (SRS). Goals: mentor-style CSE
tutor, strict topic guardrails, provider-agnostic API
integration, streaming responses, themeable UI, deployable
Node app.

## 2. Analysis
- Audience: beginner → advanced CSE students.
- Risks: model drifting off-topic, spoon-feeding, secret key
  leakage, vendor lock-in, slow providers feeling unresponsive.
- Mitigations: dual-layer guardrails (request + response, incl.
  post-stream check), persona system prompt, mock provider,
  no dependencies, SSE streaming for perceived speed, `.env`
  kept out of version control.

## 3. Design
See `docs/architecture.md`. Zero-dependency Node HTTP server +
vanilla JS frontend for maximal portability.

## 4. Implementation
- `src/guardrails.js`: scope + safety enforcement.
- `src/tutor.js`: pedagogy-driven prompt composition.
- `src/providers.js`: pluggable model adapters, each with a
  full mode and a streaming mode.
- `public/config/ui-config.js`: single file for UI/animation changes.

## 5. Testing
Unit tests (`node:test`) for guardrails, message building, and
provider/stream resolution. Manual sandbox script for I/O
inspection.

## 6. Deployment
`npm start`; `PORT` env; any Node 18+ host or container.

## 7. Maintenance
Theme edits live in ui-config.js; new providers = one adapter
function (full + stream) + entry in `availableProviders()`.
