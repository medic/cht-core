# Curl cookbook

All commands are read-only except C2 (one deliberate login attempt).

## Setup (run once, both modes)

```sh
export CHT_URL='https://example.app.medicmobile.org'   # no trailing slash
export ADMIN_USER='admin-username'
read -s ADMIN_PASS && export ADMIN_PASS                 # prompts silently; password never appears on screen or in history
```

In guided mode, have the human run this first so no later command or pasted output
contains a password. Explain what the command does and why they need to run it exactly.
Outputs are JSON. When a command returns a large blob, prefer the `jq`-filtered
variant so the human sees (and pastes) only the essential fields; if `jq` isn't
installed, have them paste the raw output and extract the fields yourself — never
ask a human to eyeball a big JSON blob for a field.

**HTTPS variations**: if the instance is HTTPS with a **self-signed certificate**
(typical for local/dev setups), every curl command needs `-k` added or it fails —
acceptable for local development, never for a production instance. If the instance
is **not HTTPS at all**, set `CHT_URL` with an explicit `http://` scheme — and be
aware basic-auth credentials then travel unencrypted, so only do this on localhost
or a network you trust; a production CHT should always be HTTPS.

Conventions: `$USERNAME` = the affected user's login name. Placeholders in
`UPPER_CASE` must be substituted. If any endpoint returns 404, the CHT version
predates it — note it and move on.

---

### C1 — Instance health, version, fleet-level replication stats

The response is a large JSON blob; this prints only the three fields that matter:

```sh
curl -sS "$CHT_URL/api/v2/monitoring" | jq '{
  version: .version.app,
  users_over_replication_limit: .replication_limit.count,
  users_with_replication_failures: .replication_failure.count
}'
```

Without `jq`, drop the pipe and paste the whole output — the fields to extract
are `version.app` (CHT version), `replication_limit.count` (users currently over
the 10k limit), and `replication_failure.count` (users with recent sync failures;
newer CHT only — reported as `null` by the filter on older versions, that's
fine). No auth needed. Connection refused / TLS errors / HTML error pages →
infrastructure problem, stop and report that.

**If the output is empty**: curl itself failed. Re-run with
`-w '\nHTTP %{http_code}\n'` and check `echo "$CHT_URL"` — the usual causes are
an unset `CHT_URL` (env vars don't carry across terminals), a self-signed cert on
a local dev instance (add `-k`, local only), a redirect (`http://` URL — add `-L`
or fix the scheme), or a 404 on a very old CHT (try `/api/v1/monitoring`).

### C2 — Test login (max ONE attempt; guided mode: the human runs it)

```sh
curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$CHT_URL/medic/login" \
  -H 'Content-Type: application/json' \
  -d '{"user":"USERNAME","password":"THE_USERS_PASSWORD"}'
```

Only the 3-digit status code is printed — safe to paste back.
`302` = credentials valid, problem is elsewhere. `401` = rejected (wrong password,
SSO-only user, or missing `_users` doc). `429` = rate-limited — wait 30s, do NOT
retry in a loop. `500` = server-side, usually a missing `medic` user doc (→ C3).

### C3 — The two user docs

Every CHT user has two docs that must both exist and agree:

```sh
curl -sS -u "$ADMIN_USER:$ADMIN_PASS" "$CHT_URL/_users/org.couchdb.user:USERNAME" \
  | jq '{roles, facility_id, contact_id, oidc_username, password_change_required, token_login}'
curl -sS -u "$ADMIN_USER:$ADMIN_PASS" "$CHT_URL/medic/org.couchdb.user:USERNAME" \
  | jq '{roles, facility_id, contact_id, oidc_username}'
```

(The `jq` filter also keeps password hashes out of the pasted output; without
`jq`, paste the raw docs but remove the `derived_key` and `salt` fields first.)

Inspect: both exist (a 404 on either is a diagnosis — see triage tree A3/B;
the filter turns a 404 into a jq parse error — drop the pipe to see the real
response);
`roles` (identical on both? online or offline role?); `facility_id` (missing →
empty-app Branch F); `contact_id`; `oidc_username` (present → SSO-only, password
login blocked); `password_change_required` (true → forced reset redirect);
`token_login` (state and expiry for magic-link logins).

### C4 — App settings (config suspects)

```sh
curl -sS -u "$ADMIN_USER:$ADMIN_PASS" "$CHT_URL/api/v1/settings" > settings.json
```

Large output — save to a file; in guided mode ask for specific keys instead of the
whole file: `app_url`, `replication_depth`, `purge`,
`district_admins_access_unallocated_messages`, `oidc_provider`, `token_login`,
and the `roles`/`permissions` entries for the user's roles.

### C5 — Find users by OIDC username (SSO branch)

```sh
curl -sS -u "$ADMIN_USER:$ADMIN_PASS" \
  "$CHT_URL/api/v2/users?facility_id=&contact_id=" | grep -i 'IDP_EMAIL'
```

Simplest reliable form: fetch the users list and search for the identity
provider's email claim. Exactly one user must carry it in `oidc_username`;
zero or several → the SSO error observed.

### C6 — Live doc count for a role + place (the primary probe)

```sh
curl -sS -u "$ADMIN_USER:$ADMIN_PASS" \
  "$CHT_URL/api/v1/users-info?role=ROLE&facility_id=FACILITY_ID&contact_id=CONTACT_ID"
```

`role` and `facility_id` are required (`contact_id` optional). `role` may be a JSON
array for multi-role users: `role=%5B%22chw%22%2C%22supervisor%22%5D`
(URL-encoded `["chw","supervisor"]`). The role must be an offline role.
Response: `{"total_docs":N,"warn_docs":M,"warn":bool,"limit":10000}` —
`warn` fires on `warn_docs`. Admin queries never include tasks: tasks are
connected to a specific user, not to a role or facility (only an offline user
calling this endpoint about themselves gets tasks in `total_docs`). The count is
therefore partial — if it exceeds the limit by a large amount even without tasks,
that alone confirms the problem. For a task-inclusive number use C7's `count`,
recorded at the user's last real sync.
The admin user needs the `can_update_users` permission (403 otherwise).
**Hypotheticals allowed**: any role/facility combination can be queried without
touching the user — this powers the bisection method in too-many-docs.md.

### C7 — Count at last successful sync

```sh
curl -sS -u "$ADMIN_USER:$ADMIN_PASS" "$CHT_URL/api/v1/users-doc-count?user=USERNAME"
```

Requires a server-admin account. Returns the log written at the user's last
completed sync: `count` (post-purge, what the device got), `all_docs_count`
(pre-purge), `date` (epoch ms — convert and report how long ago). No entry →
the user has never completed a sync.
In older CHT versions, the documents which provide information for this endpoint were only updated: either monthly, 
or when the delta between the last sync and the current sync was larger than 100. Since CHT 5.2, this returns the date 
of the last sync.

### C8 — Replication failure log (newer CHT; 404 → skip)

```sh
curl -sS -u "$ADMIN_USER:$ADMIN_PASS" \
  "$CHT_URL/api/v1/replication-failure-logs?user=USERNAME"
```

Added in CHT v5.2. Server-admin only; newer CHT (404 → skip).
Per-failure entries: `status_code` (**0 = device aborted
mid-download — the timeout signature**), `duration`, `docs_count`,
`unpurged_docs_count` (null = that phase never completed), plus `daily_failures`
counters. Optional `reporting_period=YYYY-MM` for past months.

### C9 — Fleet view: who else is failing

```sh
curl -sS -u "$ADMIN_USER:$ADMIN_PASS" \
  "$CHT_URL/api/v1/replication-health/failed?days=30&min_failures=1"
```

Added in CHT v5.2. Server-admin only; newer CHT (404 → skip). 
Lists users with sync failures and no
success since: `last_replication_date`, `failures_since_last_replication`.
One affected user → user-specific cause; many → config- or data-level cause.

### C10 — Contact volume by depth (the replication pathway)

Replication computes a user's contact set from the `medic/contacts_by_depth` view,
keyed `[facility_id, depth]`. Query the same view per depth level to see exactly
what replication would count:

```sh
for DEPTH in 0 1 2 3 4 5; do
  printf 'depth %s: ' "$DEPTH"
  curl -sS -u "$ADMIN_USER:$ADMIN_PASS" \
    "$CHT_URL/medic/_design/medic/_view/contacts_by_depth?key=%5B%22FACILITY_ID%22,$DEPTH%5D" \
    | jq '.rows | length'
done
```

(Without `jq`: pipe to `grep -o '"id"' | wc -l`.)

Interpretation: the cumulative sum through depth D is precisely what a user capped
at `replication_depth` D would replicate. The level where the count explodes is
where to cap. The user's *effective* depth comes from the `replication_depth`
setting (C4): the **highest** `depth` across their roles — a role with no entry
means **unlimited**. `replicate_primary_contacts: true` additionally pulls in each
in-depth place's primary contact even when that person is below the cap. Counts
contacts only — reports usually dominate; attribute those with C6.

### C11 — Advanced: raw per-subject doc counts

`docs_by_replication_key` — the index replication itself walks — changed shape in
CHT 5.0.0, so pick the form matching the version from C1.

**CHT 5.0.0 and later** — it is a Nouveau (Lucene) index; `total_hits` counts the
docs emitted for one subject directly:

```sh
curl -sS -u "$ADMIN_USER:$ADMIN_PASS" \
  "$CHT_URL/medic/_design/medic/_nouveau/docs_by_replication_key?q=key%3A%22SUBJECT_ID%22&limit=1" \
  | jq '.total_hits'
```

A subject is a place/contact uuid **or** its shortcode (`patient_id`/`place_id`) —
reports are usually emitted under the shortcode, so query both and sum to get the
full picture for one contact. Add `AND type:data_record` (or `type:contact`, etc.)
to the `q` value to split a subject's count by doc type — that's the
contacts-vs-reports split C10 can't give you.

**CHT 4.x and earlier** — the same index is a CouchDB map view (the `_nouveau`
form 404s there, and the view form 404s on 5.x):

```sh
curl -sS -u "$ADMIN_USER:$ADMIN_PASS" \
  "$CHT_URL/medic/_design/medic/_view/docs_by_replication_key?key=%22SUBJECT_ID%22" \
  | jq '.rows | length'
```

---

## L — Server-shell checks (tier 3, optional)

Only when a shell on the host is available; never required.

### L1 — API logs

```sh
docker logs --tail 2000 <api-container> 2>&1 | grep -iE 'error logging in|failed to find user|sso|token'
```

Signatures: `Failed to find user with name [...] in the [medic] database`
(missing settings doc → login 500), `Error logging in via SSO`,
`Password Login Not Permitted For SSO Users`, `Error getting authCtx`.

### L2 — Rate-limit pressure

```sh
docker logs --tail 5000 <api-container> 2>&1 | grep -c ' 429 '
```

A constant stream of 429s means something is hammering login (stuck device,
script) and locking out legitimate users sharing an IP or a common wrong password.

## Guided-mode safety reminders

- The affected user's password goes only into C2, run by the human; only the status
  code comes back.
- Admin credentials live in env vars; no pasted command or output should contain
  them. If output accidentally includes an `AuthSession` cookie, tell the human to
  redact it and consider that session compromised.
