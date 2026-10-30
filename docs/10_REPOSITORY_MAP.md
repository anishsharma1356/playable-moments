# Target repository map
This is the structure Codex should create; the application folders are not implemented in the handoff.

```text
playable-moments/
├── AGENTS.md
├── ARCHITECTURE.md
├── CODEX_START_HERE.md
├── package.json                  # workspace scripts
├── pnpm-workspace.yaml
├── pnpm-lock.yaml                # actual tested versions, created during setup
├── tsconfig.base.json            # strict types
├── .env.example                  # safe template only
├── apps/
│   ├── web/
│   │   ├── src/app/              # router, auth context, error boundary
│   │   ├── src/pages/studio/     # setup/library, live control, review/publish
│   │   ├── src/pages/overlay/    # read-only safe state, OBS layout
│   │   ├── src/pages/replay/     # setup/choice/reveal/comparison state machine
│   │   ├── src/components/      # video, choice card, status, trim review
│   │   ├── src/api/             # typed HTTP, CSRF, SSE reconnect
│   │   └── src/styles/          # tokens, responsive and accessible styles
│   └── server/
│       ├── src/main.ts          # configuration/bootstrap/recovery/shutdown
│       ├── src/config.ts        # environment validation; mode separation
│       ├── src/auth/            # OAuth + creator/replay sessions
│       ├── src/twitch/          # WSS adapter, schema, refresh, health
│       ├── src/moments/         # routes and domain orchestration
│       ├── src/votes/           # ordered intake, parser, dedupe, snapshot
│       ├── src/media/           # upload, probe, render worker, safe file routes
│       ├── src/publication/     # approval gates, immutable versions, revoke
│       ├── src/replay/          # safe manifests, personal choices, reveal gate
│       ├── src/realtime/        # owner vs overlay SSE projections
│       ├── src/storage/         # SQL repositories, migrations, disk abstraction
│       ├── src/observability/   # redacted logging, health, audit
│       └── migrations/         # numbered SQL files from reviewed reference DDL
├── packages/
│   ├── core/src/               # pure states, parser, invariants, review hash
│   └── contracts/src/          # shared Zod schemas and safe DTOs
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── fixtures/               # labelled synthetic data and original video tools
│   └── load/                   # offline replay; never fake Twitch engagement
├── contracts/                  # maintained SQL/OpenAPI/JSON schemas
├── docs/                       # setup, architecture, progress, evidence, limits
├── diagrams/                   # editable source maps and rendered views
├── ops/                        # Dockerfile, compose, proxy, backup/runbook
└── data/                       # gitignored local data; persistent volume hosted
```

Do not hide all business rules in React components. Public DTOs must be constructed explicitly. Domain code must be testable without Twitch, OBS, a database, or a browser. Integration tests still exercise real persistence and HTTP access boundaries.

## Ports and origin convention
Development UI: `http://localhost:5173`. Fastify: `http://localhost:3000`. Vite proxies API/auth for browser use. Registered callback: `http://localhost:3000/auth/twitch/callback`; callback redirects only to configured APP_ORIGIN. Same hostname cookies can work across these ports, but Origin checks must deliberately allow the frontend origin. Do not use a wildcard.

Production: one HTTPS origin serves both UI and API. No public Vite dev server. Do not expose internal SQLite or media folders through the proxy.
