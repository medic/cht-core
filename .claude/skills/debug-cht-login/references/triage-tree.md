# CHT login triage tree

Work top-down; each branch starts from the symptom router in SKILL.md Step 3.
Commands referenced by number live in `curl-cookbook.md`.

## Check 0 — Instance health and version (always run first)

Run **C1** (monitoring probe, no auth). Confirms the instance is reachable, gives
the CHT version (endpoint availability depends on it), and — bonus — includes
`replication_limit.count`: how many users on this instance are already over the
10,000-doc limit. If that number is large, the too-many-docs branch just became a
lot more likely.

If the instance itself is unreachable, stop: this is an infrastructure problem
(DNS, TLS, reverse proxy, instance down), not a user problem.

## Branch A — "Incorrect user name or password" (a 401)

The login page shows this for exactly one thing: CouchDB's `/_session` rejected the
credentials with 401. Causes in order of likelihood:

1. **Wrong credentials.** Run **C2** — one deliberate test login (guided mode: the
   human runs it; the user's password must never enter the chat). `302` = the
   credentials are fine, the problem is elsewhere; `401` = genuinely rejected.
   Do not retry on failure — see the rate-limit warning in SKILL.md.
2. **SSO-only user.** If the user doc has `oidc_username` set and the instance has
   an `oidc_provider` configured, password login is blocked with 401
   ("Password Login Not Permitted For SSO Users") *even with the right password*.
   Run **C3** (fetch both user docs) and look for `oidc_username`. Fix: the user
   must log in via the SSO button, or an admin removes `oidc_username`.
3. **Missing `_users` doc.** If the account was created by writing directly to the
   `medic` db (or a restore went wrong), CouchDB has nothing to authenticate
   against. **C3** shows this: `_users` doc 404s while the `medic` doc exists.
4. **Clustered-Couch password race.** Right after a password change on a clustered
   instance, `/_session` can 401 briefly while the change propagates. The API
   retries 10× internally; if the user changed their password minutes ago, have
   them wait a minute and try once more before digging further.

## Branch B — "Unexpected error while logging in"

The login page shows this generic message for **every non-401 failure** — the
status code is the real signal. Run **C2** and read the code:

- **429 — rate-limited.** 10 failed logins within 10 seconds trips it. The limiter
  keys on IP, username, **and the password string**: many users behind one NAT/IP,
  or several users typing the same common wrong password, can lock each other out.
  It is in-memory with a 10-second window — waiting ~30 seconds and trying once
  usually clears it. If it recurs constantly, something is hammering the login
  endpoint (a script, a stuck device) — check API logs for 429s (server shell, L2).
- **500 — server-side failure.** Most common cause: the credentials are *valid* but
  the user's settings doc `org.couchdb.user:<name>` is **missing from the `medic`
  database** (the mirror of #3 above). Run **C3**: `_users` doc present, `medic`
  doc 404 → confirmed. The API log line to look for (L1, if shell available) is
  `Failed to find user with name [...] in the [medic] database`.
- **302 — login actually succeeded.** The failure is *after* login: go to Branch E
  (replication) or F (empty app).

## Branch C — Token login (magic links / SMS links)

Error page states map to: `disabled` (token login not enabled in settings),
`missing` (malformed link), `invalid` (token consumed or never existed — links are
single-use), `expired` (past `expiration_date` — tokens are time-boxed). Run **C3**
and inspect the `token_login` object on the user docs for state and expiry.
Also verify the `app_url` setting matches the real public URL (**C4**): a wrong
`app_url` generates token links pointing at the wrong host.

## Branch D — SSO/OIDC login

The login page redirects back with a banner. Two variants:

- "You are not allowed to log in with SSO" → the email from the identity provider
  matched zero or multiple CHT users. Run **C5** to find users by `oidc_username`;
  exactly one user must have `oidc_username` equal to the IdP email claim.
- Generic error → configuration: missing/invalid `oidc_provider` settings, missing
  client secret, or `app_url` not matching the real host (the OIDC callback URL is
  built from it). Run **C4**; check API logs for `Error logging in via SSO` (L1).

## Branch E — Login succeeds, sync fails or warns (the big one)

Signatures, from most to least explicit:

- Bootstrap warning: *"You are about to download N docs, which exceeds recommended
  limit of 10000."* Continue proceeds anyway; **Abort sends the user back to the
  login screen** — which is exactly why this gets reported as "can't log in".
- Loading screen spins forever, or the app eventually bounces to login: initial
  replication is timing out or failing. On flaky connections a user with 9,000 docs
  can be just as stuck as one over the limit.

Evidence to collect:

1. **C6** — `users-info`: the live count for this user's role + facility
   (`total_docs`, `warn_docs`, `warn`). This is the primary probe.
2. **C7** — `users-doc-count`: the count recorded at the user's **last successful
   sync**, with its date. A stale date tells you how long they've been stuck.
3. **C8** — `replication-failure-logs` (newer CHT only; 404 = skip): per-failure
   records. `status_code: 0` means the device gave up mid-download — the timeout
   signature. Repeated recent failures with high `docs_count` confirm the branch.
4. **C9** — `replication-health/failed`: all users currently failing to replicate —
   tells you whether this is one user or a cohort (one user → their place/role;
   a cohort → config-level cause like a purge regression or new data volume).

If `warn` is true or counts are near/over 10,000 → descend into
`too-many-docs.md`. If counts are modest but failures persist → investigate
connectivity/device (network quality, device storage, app version) and, at L2,
API/haproxy logs for the user's requests.

## Branch F — Login works but the app is empty

Not a login failure, but often reported as one. A user whose `facility_id` is
missing replicates almost nothing (just the design doc and their own settings) —
login succeeds, app loads, zero contacts. **C3**: check `facility_id` on the
`_users` doc. Fix: an admin sets the user's place in App Management → Users.

## Cross-cutting checks (any branch)

- **Roles sanity** (Admin UI tier is enough): App Management → Users → the user.
  An *online* role means the user doesn't replicate at all (Branch E impossible,
  Branch F symptoms expected offline behavior). Role changes made while a user is
  logged in force a logout on their device — a user "randomly logged out" right
  after an admin edited them is expected behavior.
- **Forced password change**: `password_change_required: true` on the user doc
  redirects every login to the password-reset page. If the user reports a loop
  there, the new password is failing validation (too short/weak/same as before).
- **Reverse proxy**: if *all* users fail with generic errors, suspect the proxy
  (stripped cookies, wrong Host header) before suspecting users.
