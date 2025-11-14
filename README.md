# SparkHub

SparkHub is a polished, performance‑focused web platform for building, sharing, and collaboratively editing interactive Spark projects — animations, micro‑games, interactive tutorials, and visual prototypes. It is powered by TomAs’ in‑house WebAnimate engine and a large set of custom editor and runtime features crafted for fast iteration, deterministic playback, and production‑ready exports.

SparkHub showcases advanced engineering and product craftsmanship: a deterministic timeline engine, a hybrid DOM/canvas renderer, a compact project manifest format, and developer tooling that supports hot reload, CI, and production deployments.

---

## Key Highlights

- **In‑house WebAnimate engine** — custom runtime developed alongside SparkHub to deliver frame‑accurate timelines, deterministic playback across sessions, and tight editor integration.  
- **Authoring‑first UX** — instant preview, hot‑reload, keyboard‑first controls, frame‑accurate scrubbing, and timeline keyframe editing.  
- **Extensible scene graph and plugin surface** — reusable components, inline behavior expressions, and a sandboxed plugin surface for advanced interactions.  
- **Custom features by TomAs** — deterministic random seeds for collaborative previews; compact serialization for minimized bundle size; inline expression language for timeline logic; modular input abstraction supporting keyboard, touch, and gamepads.  
- **Performance and production readiness** — asset fingerprinting, incremental builds, CDN‑friendly export bundles, and optional S3 storage adapters.  
- **Developer tooling and reliability** — typed interfaces, ESLint/Prettier style rules, unit and integration test suites, and Docker/CICD examples.

---

## What Makes SparkHub Stand Out

- WebAnimate is a first‑class runtime, not a third‑party add‑on. That enables deterministic, low‑latency editor previews and feature parity between editor and exported runtime.  
- Many bespoke systems authored by TomAs optimize for developer experience and production: deterministic replay, compact manifests, migration utilities for schema evolution, and an input/event tracing system designed for debugging complex interactive behavior.  
- Engineering emphasis on clarity and maintainability: modular codebase, typed contracts between engine and UI, and test coverage to prevent regressions in the editor/engine boundary.

---

## Feature Summary

- Live authoring: frame‑accurate timeline scrubbing, keyframe editing, live preview with hot reload  
- Engine capabilities: declarative timeline sequencing; easing/interpolation primitives; hybrid DOM + canvas renderer; scene graph with layers, masks, and z‑ordering  
- Interactivity: inline behavior expressions; scriptable components; input abstraction for keyboard, mouse, touch, and gamepad; custom event tracing for debugging  
- Collaboration & publishing: versioned manifests, publish/unpublish workflow, role‑based share links, exportable bundles for embedding or CDN delivery  
- Developer tools: project manifest schema and loader API; asset pipeline with fingerprinting; Dockerfile and sample GitHub Actions workflows  
- Quality & safety: sandboxed plugin execution; server‑side validation for uploaded assets; CI test and lint gating

---

## Repository Layout

- engine/ — WebAnimate runtime, loaders, interpolation primitives, and plugin APIs  
- src/ — React SPA client, editor UI, and viewer components  
- server/ — Node.js/Express API, auth, storage adapters, publish logic  
- public/ — static shell and shared assets  
- docs/ — design notes, manifest schema, API docs, and examples  
- scripts/ — build, test, and deployment helpers  
- tests/ — unit and integration tests

---

## Getting Started (Development)

Prerequisites: Node.js (LTS recommended), Git, and a UNIX‑like shell.

1. Clone the repository:
   - git clone https://github.com/TomAs-1226/SparkHub.git
2. Install dependencies:
   - cd SparkHub
   - npm ci
3. Run in development mode:
   - npm run dev
4. Open http://localhost:3000 and use the local dev account (see docs/dev-accounts.md)

Developer notes:
- The engine module at engine/ is loaded locally and supports hot reload. Changes to engine/ reflect in the editor during development for rapid iteration.  
- Backend mocks are included for offline development. To run the full stack:
  - npm run start:server

---

## Build and Deployment

- Create a production build:
  - npm run build
- Start production server (after build):
  - npm run start:prod
- Docker:
  - docker build -t sparkhub:latest .
  - For multi‑service deployments consult docker-compose.yml in the repo root.

CI/CD:
- Example GitHub Actions workflows are provided under .github/workflows for linting, testing, and deployment. Adjust secrets and environment targets before production use.

---

## Project Format

Spark projects are designed to be compact, portable, and deterministic.

- manifest.json — project metadata, author info, version, scene index  
- scenes/ — scene JSON files describing objects, timelines, and behaviors  
- assets/ — binary assets (images, audio) referenced by scenes

The engine exposes a loader that reconstructs runtime scenes directly from the project folder with minimal processing.

---

## Architecture Overview

- Client: React single‑page app with modular routes for Editor, Browse, Publish, and Viewer.  
- Engine: WebAnimate runtime exposes a concise API for scenes, timelines, behaviors, and plugin registration; optimized for deterministic replay.  
- Server: Node.js microservice for auth, project storage, and publish operations; supports local and S3‑compatible storage adapters.  
- Delivery: Static export bundles delivered via CDN; server issues signed upload URLs for asset ingestion.

Design goals: minimize editor latency, keep runtime and editor boundaries clean for future engine swaps, and make exported bundles production friendly.

---

## Testing and Quality

- Unit tests: npm run test:unit  
- Integration tests: npm run test:integration  
- Linting: npm run lint  
- Pre‑commit hooks: Husky runs lint and unit checks before commit

---

## Security and Best Practices

- Use HTTPS and secure token handling for production deployments.  
- Validate and sanitize user uploads on the server before publishing.  
- Only install and enable plugins from trusted sources; plugin execution runs in a sandboxed environment.

---

## Roadmap

Planned improvements and priorities:

- Real‑time collaborative editing with presence cursors and conflict‑free merging  
- Plugin marketplace for reusable behaviors and export targets  
- Desktop packaging for offline authoring workflows  
- Expanded accessibility and keyboard‑first controls  
- Expanded test coverage and stress testing for collaboration scenarios

---

## Troubleshooting

- Blank canvas or missing assets: verify manifest.json and assets/ paths; check browser console for engine errors.  
- Hot reload not updating: restart dev server and clear cache.  
- CI build failures: confirm Node.js version and package manager (npm vs yarn) match project lockfile.

---

## License

SparkHub is released under the MIT License. See LICENSE for full terms.

---

## Acknowledgements

- Built and maintained by TomAs with contributions from the community.  
- WebAnimate is an in‑house engine developed and maintained by TomAs to meet SparkHub’s design goals of deterministic playback, tight editor integration, and extendable runtime behavior.


