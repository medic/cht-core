# scripts/ci

CI helper scripts for CHT Core.

## `.secretlintrc.json` — credential leak detection

Runs via `npm run scan-logs` in both test jobs after tests complete (see `build.yml` and `scripts/ci/scan-logs.sh`).
Uses two rule sets:

### `@secretlint/secretlint-rule-preset-recommend`

The standard secretlint preset. Covers common secret formats (AWS keys, GitHub tokens, etc.) and HTTP Basic Auth credentials in URLs with a proper domain (e.g. `https://user:pass@example.com`).

### `@secretlint/secretlint-rule-pattern` — custom CHT rules

The recommended preset's `basicauth` rule only matches URLs whose host contains a dot (e.g. `example.com`). CHT services connect to `localhost` and bare hostnames like `couchdb`, so the preset would miss URLs such as `http://admin:pass@localhost:5984` or `couchdb://user:pass@couchdb:5984`. The four custom patterns below fill that gap:

| Rule | Why it exists |
|------|--------------|
| **user:pass@host URL** | Catches credential-bearing URLs in any scheme (`http`, `https`, `couchdb`, etc.) including `localhost` and bare hostnames that the preset's basicauth rule ignores. Safe values (`***`, `[REDACTED]`) are excluded via the URL structure (no credentials means no `user:pass@`). |
| **credential in query parameter** | Catches `?password=…`, `?token=…`, `?pass=…`, etc. in logged request URLs. Excludes already-masked values (`***`, `****`, `[REDACTED]`) via a negative lookahead so intentionally-redacted logs don't trigger false positives. |
| **credential in JSON key/value** | Catches JSON objects logged to stdout/stderr that contain sensitive keys (`"password":"…"`, `"secret":"…"`, etc.). Excludes `***` and `[REDACTED]` values via a negative lookahead. |
| **Authorization header** | Catches `Authorization: Basic …` and `Authorization: Token …` lines accidentally written to logs. Excludes `Bearer ***` (three or more stars) which is the CHT convention for masking bearer tokens; a single `*` prefix is not treated as a mask. |
