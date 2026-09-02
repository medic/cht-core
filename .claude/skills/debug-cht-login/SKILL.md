---
name: debug-cht-login
description: Diagnose why a CHT (Community Health Toolkit) user cannot log in or cannot get past initial sync — wrong credentials, rate-limiting, SSO/token-login problems, broken user docs, or users with too many documents to replicate. Use when someone reports a CHT login failure, "Incorrect user name or password", "Unexpected error while logging in", a stuck loading/sync screen, a "You are about to download N docs" warning, or replication limit problems.
---

# Debug CHT login failures

You are helping a CHT deployer find out why a specific user cannot log in to their
CHT instance, and what to do about it. Assume the person you are working with is
**not** a CHT internals expert: explain what each check means before asking for it,
and never assume knowledge of CouchDB, replication, or app settings.

**You diagnose and recommend. You never modify the instance.** All commands in this
skill are read-only (GET requests, plus at most one deliberate test login). If a fix
requires changing settings, users, or data, describe the change and hand it to the
human.

**Ask with selections, not free text.** Every question in this skill is presented
as a structured selection prompt the human can answer by picking an option — in
Claude Code use the AskUserQuestion tool; in a harness without one, present the
same options as a compact numbered list answerable with a single number. Never
make the human type a response that could have been an option. The only value
that may ever require typing is the affected username, and only in autonomous
mode.

**Start fast.** Your first output, right off the bat, is the Step 1 mode
selection. Nothing precedes it: no MCP or tool-registry lookup, no checking of
environment variables, no shell commands, no file reads. Every check belongs
*after* the human has chosen a mode, and only the chosen mode's checks happen at
all. Do **not** read the reference files up front; load each one only when its
step needs it: the triage tree when triage begins, the too-many-docs deep-dive
only if that branch is reached, the cookbook when you need an exact command.

## Step 1 — Mode selection (first output, single-select)

Immediately present one single-select question — "How should I run the
diagnostics?" — with exactly these two options:

- **Autonomous** — "I run the read-only diagnostic commands myself from this
  machine. Requires the instance URL and admin credentials as environment
  variables in my shell session."
- **Guided** — "I give you each command to run in your own terminal and interpret
  what you paste back. I never see your instance URL or any credentials."

Never pick a mode silently. Having a shell is not permission to use it: the
commands carry admin credentials against the human's instance, so autonomous mode
is their explicit choice, never a default. (If you have no tool access at all,
guided mode is the only option — state that in one line instead of asking.)

### If the human selects Autonomous — run the environment checks now

This is the only point where environment checks happen:

1. **One tool-registry search** for the `cht-debug` MCP tools (`instance_health`,
   `get_user_docs`, `users_info`, ...) — seconds, not minutes. Many harnesses
   lazy-load MCP tool schemas, so the tools may exist without appearing in your
   visible tool list — search the registry (e.g. ToolSearch in Claude Code)
   before concluding the server is absent. These tools are the preferred
   executor: the server holds the admin credentials and enforces read-only access
   in code, so no secret ever enters the conversation. It is a stdio child
   process the client spawns automatically — there is never anything to install,
   launch, or keep running. If a tool replies that `CHT_URL` or
   `ADMIN_USER`/`ADMIN_PASS` is not set, the server works but lacks
   configuration: don't debug it or hunt through docs — tell the human to export
   those variables in their terminal and restart the session, and meanwhile
   continue with curl. (Registration instructions, if the human wants them:
   [scripts/mcp/README.md](scripts/mcp/README.md).)
2. **Without MCP tools**: check whether `CHT_URL`, `ADMIN_USER`, `ADMIN_PASS` are
   set in your shell — test presence only, never print values (e.g.
   `[ -n "$CHT_URL" ] && echo set`). If any are missing, ask the human to set
   them in your session (`read -s` for the password, so it lives only in session
   memory), then run the cookbook curl commands yourself. Never echo or log
   credential values.

### If the human selects Guided

The human executes everything. **Never ask for the instance URL, any credential,
or any other secret — not once.** Commands reference `$CHT_URL` and placeholders
like `USERNAME` that the human substitutes in their own terminal; everything you
need to know (CHT version, counts, status codes) arrives in the outputs they
paste back. For each step give them: (1) one sentence on why, (2) the exact
command **copied verbatim from the cookbook** — never re-derive or simplify it;
the flags and `jq` filters are there because their absence caused real failures —
and (3) ask them to paste the output back, whole. The command itself must already
reduce the output to the essential fields (the cookbook's `jq` variants do this);
**never ask a human to locate fields inside a JSON blob** — if `jq` isn't
installed, they paste everything and you extract. Have them run the cookbook's
setup block once at the start so no command or pasted output ever contains a
password, and tell them to redact any `AuthSession` cookie values before pasting.

Everything below is mode-agnostic: each check is *goal → command → interpretation*,
and every check has both an MCP tool and a curl form (mapping in
[scripts/mcp/README.md](scripts/mcp/README.md)). The mode only decides who — or
what — presses enter. Exception: the test-login check (C2) is run by the human in
**every** mode, because the affected user's password must never enter the
conversation; the MCP server deliberately has no login tool.

**Never instruct the human to write credentials into a file** (env files, config
files, notes). Session environment variables set with `read -s` disappear when the
terminal closes; files persist on disk in plaintext.

## Step 2 — Access and context (one batched selection prompt)

After the mode is set (and autonomous env checks are done), ask these together in
one structured prompt — selections, not free text:

1. **Access — multi-select**: "Which of these do you have?"
   - **Admin UI** (App Management in the browser) — roles, permissions, and the
     replication warning on the edit-user page.
   - **Admin credentials + a terminal** — the main path; commands go to the
     instance's public HTTPS endpoint from any laptop, no server access needed;
     the full triage tree works with this.
   - **Server shell** (docker/kubectl on the host) — optional; only needed to
     read API logs for a handful of checks. Never require it; mark those checks
     "if available".
2. **Symptom — single-select**: "What exactly does the affected user see?" with
   the options from the routing table below (one option per row, plus the
   automatic free-text fallback for anything else).
3. **Scope — single-select**: one user affected / several / everyone.
4. **Timing** (optional, may be an option list: just started / after a user or
   config change / always been like this / unknown).

In autonomous mode also collect the affected **username** (typed — the one
unavoidable free-text answer). In guided mode, do not collect it: the human
substitutes `USERNAME` in the commands themselves.

## Step 3 — Route on the symptom

The symptom selection forks the whole investigation:

| What the user reports seeing                                                                              | Likely branch                                                                      |
|-----------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| "Incorrect user name or password"                                                                         | 401 from CouchDB: wrong credentials, SSO-only user, or auth race — branch A        |
| "Unexpected error while logging in"                                                                       | Anything that is not a 401: rate-limit 429, server 500, broken user doc — branch B |
| Login works, then "You are about to download N docs…" warning                                             | Too many docs — branch E                                                           |
| Login works, then loading/sync spins forever, polling replication, or the app returns to the login screen | Replication failing or timing out — usually too many docs — branch E               |
| Token/SSO-specific error pages                                                                            | Branch C / D                                                                       |
| Login works but the app is empty (no contacts/reports)                                                    | Not a login failure: user has no `facility_id` or missing permissions — branch F   |

If the timing answer points at a recent change (a user edit, role change,
deployment, or config push), weight the matching branch accordingly — e.g. roles
changed yesterday + forced logout today is expected behavior, not a bug.

## Step 4 — Run the triage tree

Follow [references/triage-tree.md](references/triage-tree.md). Principles:

- Cheapest checks first; stop descending a branch as soon as evidence rules it out.
- Never run repeated failed test logins: the API rate-limits **10 failures per 10
  seconds**, keyed on IP, username, *and the password string itself* — you can lock
  out the user (or others) while debugging. At most one deliberate test login, and
  in guided mode the human runs it so the user's password never enters the chat.
- In autonomous mode, if the user provides you with an invalid password, you should
  immediately terminate the investigation, as repeated requests can block the admin user from accessing the instance.
- If the tree lands on "too many documents", descend into
  [references/too-many-docs.md](references/too-many-docs.md).
- If an endpoint returns 404, the instance's CHT version predates it — note that and
  use the fallback listed in the cookbook, or skip the check.
- The reference files were grounded against a specific cht-core version. If tools
  from the CHT knowledge MCP servers are available (`cht-core-wiki` /
  OpenDeepWiki, CHT Docs), use them to verify mechanisms on other versions or to
  answer "how does this actually work" questions the references don't cover
  (registration: [scripts/mcp/README.md](scripts/mcp/README.md)).

## Step 5 — Report

End with a structured report:

1. **Symptom** — what the user experiences, in their words.
2. **Evidence** — each check run, its result, one-line interpretation.
3. **Diagnosis** — the root cause, stated plainly, with the mechanism explained in
   one short paragraph a non-expert can follow.
4. **Recommended fixes** — ranked by safety and effort, each with its trade-off.
   Recommend only; do not apply.
5. **Open questions** — anything you could not verify at the available access tier,
   and what access would resolve it.

## Portability

This skill is plain markdown, curl, and one dependency-free Node script. To use it
with any other LLM or agent: provide SKILL.md plus the three reference files as
context. The MCP server ([scripts/mcp](scripts/mcp/README.md)) works with any
MCP-capable client, not just Claude. Guided mode requires no tool access at all —
the model only generates commands and interprets pasted output.
