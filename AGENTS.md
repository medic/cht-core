# AGENTS.md — CHT Core Quick Reference

## MCP Servers

AI agents should query these MCP servers for detailed project information:

- **CHT Docs MCP** (via Kapa.ai) - Full CHT documentation: setup instructions, architecture, code conventions, contributing guides
  - URL: `https://mcp-docs.dev.medicmobile.org/mcp`
- **OpenDeepWiki MCP** (for medic/cht-core) - Codebase navigation, repository structure, and code-level documentation
  - URL: `https://opendeepwiki.dev.medicmobile.org/api/mcp`

---

## Monorepo Structure

- **`api/`** — Node.js server providing REST APIs, security, and filtered CouchDB replication
- **`sentinel/`** — Node.js service that runs transitions (validations, scheduled messages, alerts) on every CouchDB document change
- **`webapp/`** — Angular + NgRx single-page app for care teams (the main CHT web UI)
- **`admin/`** — AngularJS single-page app for program administrators ("App Management")
- **`shared-libs/`** — npm workspaces containing shared libraries used across services (e.g. `cht-datasource`, `transitions`, `rules-engine`)
- **`config/default/`** — Default CHT app configuration used for testing
- **`tests/`** — Integration and e2e tests that run against a live CHT instance
- **`scripts/`** — Build, CI, and deployment helper scripts

---

## Architecture Overview

NGINX proxies requests to the API service, which connects to CouchDB via HAProxy. Sentinel runs as a background service processing every CouchDB document change. The Webapp uses PouchDB for offline-first sync with CouchDB.

For full architecture details, query the CHT Docs MCP or see https://docs.communityhealthtoolkit.org/technical-overview/architecture/cht-core/

---

## Dev Environment Setup

- **Node.js 22.x**, **npm 10.x**, **Docker**, `xsltproc`, `jq`, `git`, `make`, `g++`
- Set env vars: `COUCH_NODE_NAME=nonode@nohost` and `COUCH_URL=http://medic:password@localhost:5984/medic`
- Start CouchDB via Docker, then run 3 terminals: `npm run build-dev-watch`, `npm run dev-api`, `npm run dev-sentinel`

For full setup instructions, query the CHT Docs MCP or see https://docs.communityhealthtoolkit.org/community/contributing/code/core/dev-environment/

---

## Where to Put New Code

- **New service-level code** → `api/src/`, `sentinel/src/`, or `webapp/src/ts/`
- **New unit tests** mirror the source path: `api/src/foo.js` → `api/tests/mocha/foo.spec.js`
- **New shared functionality** used by multiple services → `shared-libs/`
- **New e2e tests** → `tests/e2e/default/`
- **New integration tests** → `tests/integration/`

---

## Code Style & Conventions

- TypeScript for `webapp/` and newer shared-libs; JavaScript (CommonJS) for `api/`, `sentinel/`, `admin/`
- 2-space indentation, single quotes, semicolons required
- `const`/`let` only (never `var`); strict equality (`===`) throughout
- `lowerCamelCase` for functions, `ALL_UPPERCASE` for constants, `snake_case` for CouchDB properties

For full style guide, query the CHT Docs MCP or see https://docs.communityhealthtoolkit.org/community/contributing/code/style-guide/

---

## npm Commands

### Build & Lint

```bash
npm run build-dev           # development build (webapp + shared-libs)
npm run build-dev-watch     # build + watch for changes
npm run lint                # ESLint + blank-link-check + shellcheck
npm run lint-translations   # check translation files
```

### Unit Tests

Unit tests run entirely in-process — no running CHT instance required.

```bash
npm run unit                # all unit tests: webapp + admin + shared-libs + api + sentinel

# Run individual service unit tests:
npm run unit-webapp         # Angular (Karma) + mocha timezone tests
npm run unit-admin          # Karma (AngularJS admin app)
npm run unit-api            # Mocha — files: api/tests/mocha/**/*.js
npm run unit-sentinel       # Mocha — files: sentinel/tests/**/*.js
npm run unit-shared-lib     # npm workspaces test across all shared-libs
```

### Integration Tests

Require a running CHT instance (typically started via Docker in CI).

```bash
npm run integration-api             # API integration tests (used by `npm test`)
npm run integration-sentinel-local  # build images + run sentinel integration tests locally
npm run integration-all-local       # build images + run all integration tests locally
npm run integration-cht-form        # WebdriverIO tests for cht-form component
```

### E2E Tests

Require a fully running CHT instance and Chrome. Run via WebdriverIO (`wdio`).

```bash
npm run ci-webdriver-default         # default e2e suite
npm run ci-webdriver-default-mobile  # mobile e2e suite
npm run upgrade-wdio                 # upgrade scenario e2e tests
```

### Full CI Test Command

```bash
npm test    # lint + unit tests + integration-api
```

### Default Config Tests

```bash
npm run test-config-default    # runs tests in config/default/
```

---

## Testing Conventions

- Mocha + Chai + Sinon for `api/` and `sentinel/` tests; Karma for `webapp/` and `admin/`
- WebdriverIO + Page Object pattern for e2e tests
- Test files named `*.spec.js` or `*.spec.ts`; call `sinon.restore()` in `afterEach`
- Unit tests must not require a running CouchDB or CHT instance (`UNIT_TEST_ENV=1` stubs external calls)

For full testing guide, query the CHT Docs MCP or see https://docs.communityhealthtoolkit.org/community/contributing/code/core/automated-tests/ and https://docs.communityhealthtoolkit.org/community/contributing/code/core/style-guide-automated-e2e-tests/

---

## Static Analysis

ESLint (flat config at `eslint.config.js`) and SonarCloud both gate PRs. Run `npm run lint` before every commit.

For details, query the CHT Docs MCP or see https://docs.communityhealthtoolkit.org/community/contributing/code/static-analysis/

---

## Commit Format

Conventional Commits are used and enforced by CI:
```
feat(#1234): short description
fix(#1234): short description
chore(#1234): short description
test(#1234): short description
```
The parenthetical must contain the issue number, not a component name.

### Branching

- Branch off `master`; open PRs against `master`
- Branch naming: `<issue-number>-short-description`

---

## CI

GitHub Actions runs on Node 22.15. The main CI pipeline runs:

1. `npm run lint`
2. `npm run unit`
3. `npm run integration-api`

E2e and full integration tests run on separate CI jobs (require Docker image builds).

---

## PR Workflow

- PR title must match the Conventional Commits format
- Squash and merge by default
- Use draft PRs for early collaboration
- Self-review before requesting reviewers

For full workflow details, query the CHT Docs MCP or see https://docs.communityhealthtoolkit.org/community/contributing/code/workflow/

---

## Key Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `COUCH_URL` | Yes | — | Full CouchDB URL e.g. `http://medic:password@localhost:5984/medic` |
| `COUCH_NODE_NAME` | Yes | — | CouchDB node name e.g. `nonode@nohost` |
| `API_PORT` | No | `5988` | Port the API listens on |
| `CHROME_BIN` | No | — | Path to Chrome binary (needed for some test environments) |
