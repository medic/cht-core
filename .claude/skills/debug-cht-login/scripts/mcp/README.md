# cht-debug MCP server

A single-file, dependency-free MCP server exposing the skill's diagnostic checks as
typed, read-only tools. Requires **Node 18+**, nothing to install.

Why use it instead of curl: the server holds the admin credentials (the model never
sees them), redacts password hashes and login tokens from results, and is read-only
by construction — the safety rules live in code instead of prose.

## Configuration

Three environment variables, set on the *server* (not in the chat):

| Variable | Meaning |
|---|---|
| `CHT_URL` | Instance base URL, e.g. `https://example.app.medicmobile.org` |
| `ADMIN_USER` | Admin username |
| `ADMIN_PASS` | Admin password |

`instance_health` works without credentials; everything else needs them.

Local/dev instances: a self-signed certificate makes every tool fail TLS
verification (Node's `fetch` has no `-k` flag) — export
`NODE_TLS_REJECT_UNAUTHORIZED=0` alongside the other variables before starting
the session. Dev only, never against production. A plain-HTTP instance works by
setting `CHT_URL` with an explicit `http://` scheme.

## Registering

**Claude Code — recommended (no credentials stored anywhere)**: register the
command only; a stdio server inherits the environment of the Claude Code process
that spawns it, so set the variables in your terminal before launching:

```sh
claude mcp add cht-debug -- node /absolute/path/to/debug-cht-login/scripts/mcp/server.mjs

# then, in any terminal before starting a session that needs it:
export CHT_URL='https://example.app.medicmobile.org'
export ADMIN_USER='admin-username'
read -s ADMIN_PASS && export ADMIN_PASS
claude
```

Credentials live only in that terminal session — nothing written to disk. Without
them, `instance_health` still works and every other tool explains what's missing.

Alternatively, bake them into the registration (persists them in plaintext in
`~/.claude.json` — acceptable for dev instances, avoid for production):

```sh
claude mcp add cht-debug \
  --env CHT_URL="$CHT_URL" --env ADMIN_USER="$ADMIN_USER" --env ADMIN_PASS="$ADMIN_PASS" \
  -- node /absolute/path/to/debug-cht-login/scripts/mcp/server.mjs
```

**Claude Desktop / any MCP client with JSON config:**

```json
{
  "mcpServers": {
    "cht-debug": {
      "command": "node",
      "args": ["/absolute/path/to/debug-cht-login/scripts/mcp/server.mjs"],
      "env": {
        "CHT_URL": "https://example.app.medicmobile.org",
        "ADMIN_USER": "…",
        "ADMIN_PASS": "…"
      }
    }
  }
}
```

MCP is an open, cross-vendor standard — the same server works with any
MCP-capable client, not just Claude.

## Tools ↔ cookbook checks

| Tool | Cookbook | Purpose |
|---|---|---|
| `instance_health` | C1 | Reachability, version, fleet replication stats |
| `get_user_docs` | C3 | Both user docs, hashes/tokens redacted |
| `get_settings` | C4 | Selected app-settings keys |
| `find_user_by_oidc` | C5 | SSO user matching |
| `users_info` | C6 | Live doc count for role + facility (supports hypotheticals) |
| `users_doc_count` | C7 | Count at last successful sync |
| `replication_failure_logs` | C8 | Per-failure records (newer CHT) |
| `replication_health` | C9 | Fleet failure view (newer CHT) |
| `contact_depth_profile` | C10 | Per-depth contact histogram along the replication pathway (`contacts_by_depth`), configured-depth resolution, primary-contact impact |

Deliberately **not** a tool:

- **C2 (test login)** — the affected user's password must never pass through the
  model, so that check is always run by the human, in every mode.
- **C11 (raw view counts)** — advanced/version-dependent; use the curl form.

## Companion knowledge servers (optional)

Medic hosts public MCP servers that let the agent look up CHT internals on demand —
useful when the instance's CHT version behaves differently from what the skill's
references describe. No authentication needed. Docs:
https://docs.communityhealthtoolkit.org/ai/mcp-servers/

```sh
claude mcp add cht-core-wiki --transport http \
  "https://opendeepwiki.dev.medicmobile.org/api/mcp?owner=medic&name=cht-core"
```

Same pattern for the other repos — replace `cht-core` with `cht-conf`,
`cht-watchdog`, or `cht-sync`. For non-Claude clients use the equivalent HTTP/remote
server config with the same URL. `cht-core` is the one that matters for this skill
(login/replication internals live there); add the others only if you also debug
config, monitoring, or sync pipelines.

## Smoke test

```sh
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | CHT_URL=https://example.app.medicmobile.org node server.mjs
```

Expect two JSON lines: the handshake and the nine-tool list.
