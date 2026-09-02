# Deep-dive: too many documents to replicate

Enter here when triage shows a user at or over the warning threshold, or timing out
on initial replication. Goal: explain **which docs** make up the count, **why**,
and which remediation fits.

## How the count works (explain this to the deployer)

When an offline user syncs, the server computes every doc that user is allowed to
see: the contacts in their part of the hierarchy (their assigned place and
everything below it), the reports about those contacts, targets, tasks, plus a
couple of bookkeeping docs. Purged docs are subtracted.

Key facts:

- **The limit is 10,000 and it is hardcoded** — there is no setting to raise it.
  "Increase the limit" is never on the remediation menu.
- The warning threshold is evaluated on **non-task docs** (`warn_docs`); the total
  the device actually downloads (`total_docs`) **includes tasks**. A big gap
  between the two numbers means tasks are a large share of the payload.
- Exceeding the limit is a **soft warning**, not a block: the user can press
  Continue. The real failure mode is practical — download time, device storage,
  and timeouts. Treat ~10k as "expect pain", not as a cliff.
- `replication_depth` (an app setting, per role) caps how deep below their place a
  user replicates contacts, and optionally reports (`report_depth`). Missing or
  misconfigured entries silently fall back to **unlimited depth**.
- Reports with `needs_signoff` set replicate **up the hierarchy** to supervisors
  regardless of report depth — a classic silent inflator of supervisor accounts.
- If the `district_admins_access_unallocated_messages` setting is on and the role
  has `can_view_unallocated_data_records`, the user also replicates every
  **unassigned** record (docs not linked to any place) — another silent inflator.

## Attribution — find out where the docs come from

### 1. Read the numbers you already have

From `users-info` (C6) and `users-doc-count` (C7):

| Comparison | Meaning |
|---|---|
| `total_docs` vs `warn_docs` (C6) | For an offline user's *self*-query the difference is tasks. Admin hypothetical queries exclude tasks from **both** numbers (tasks are user-scoped), so there compare C7's `count` (task-inclusive, last real sync) against C6's `warn_docs`: a large gap → task volume is the problem (task retention / purging tasks). |
| `all_docs_count` vs `count` (C7) | The difference is purged docs. Small gap on an instance that *has* purge rules → purge is not matching much — review the purge function. |
| `date` (C7) | Last successful sync. Weeks ago → the user has been accumulating backlog since. |

### 2. Profile contacts along the replication pathway (C10)

Replication derives the user's contact set from the `medic/contacts_by_depth`
view: effective depth is the **highest** `replication_depth` entry across the
user's roles (no entry = unlimited), plus optionally each in-depth place's primary
contact (`replicate_primary_contacts`). **C10** (MCP: `contact_depth_profile`)
queries that same view per depth level, so its numbers are exactly what
replication computes:

- The per-depth histogram shows where the volume lives; the **cumulative count at
  depth D is what capping `replication_depth` at D would replicate** — this sizes
  remediation option 2 before you recommend it.
- Compare the configured depth's cumulative contact count against `warn_docs`
  (C6): if contacts are a small share, the volume is reports/tasks — attribute
  those with the C6 comparisons below and the purge analysis above.

### 3. What-if comparisons with `users-info` (C6)

`users-info` accepts *hypothetical* role + facility combinations — you don't have
to edit the user to ask "how many docs would a user with role R at place P get?".
This value excludes task documents, which are user scoped only. 

- Run **C6** with the same facility but each of the user's roles separately. If one
  role's count is far higher, that role's `replication_depth` entry (or lack of
  one) is the cause.
- The depth-1 rows from C10 are the facility's direct children: run **C6** against
  each child place id to find a heavy branch (one huge village vs evenly-spread
  volume — a genuinely oversized catchment).

### 4. Check the config suspects (C4 — fetch app settings)

In the settings doc look at, in order:

1. `replication_depth` — is there an entry for each of the user's roles? What
   `depth` / `report_depth`? Remember: no entry = unlimited.
2. `purge` — do purge rules exist? What do they keep/discard? (Common: purge
   final-state reports older than N months.)
3. Forms setting `needs_signoff` usage — if the affected user is a supervisor,
   check whether high-volume forms set `needs_signoff`.
4. `district_admins_access_unallocated_messages` — combined with the role's
   `can_view_unallocated_data_records` permission.

### 5. Advanced (optional, tier 2): raw per-subject counts

`docs_by_replication_key` — the index replication itself walks — changed shape in
CHT 5.0.0: a Nouveau (Lucene) index on **5.0.0 and later**, a CouchDB map view on
**4.x and earlier**. C11 has both forms; pick by the version from C1. It counts
docs per subject id and, on 5.x, can filter by doc type — the direct way to split
"contacts vs reports vs tasks for place X" when the C6/C10 comparisons aren't
conclusive. Query each subject under both its uuid and its shortcode: reports are
usually emitted under the shortcode.

## Remediation menu (recommend, never apply)

Ranked from least to most disruptive. For each, state the trade-off explicitly.

1. **Purge rules** (app settings `purge` function) — the standard fix for report
   volume. Purge completed/old reports server-side; already-synced devices shrink
   on their next sync cycle. Trade-off: purged docs are not on the device (by
   design); writing the rules needs care and they run on the server on a schedule,
   so the effect is not instant.
2. **`replication_depth` for the role** — cap contact depth and/or `report_depth`.
   Very effective for supervisor-type roles that don't need every household doc.
   Trade-off: the user loses offline access to docs below the cap;
   `replicate_primary_contacts: true` can soften this by keeping place primary
   contacts.
3. **Review `needs_signoff`** on high-volume forms — if supervisors don't actually
   work those reports offline, removing it stops the upward replication. Trade-off:
   supervisors no longer see those reports offline.
4. **Hierarchy/assignment changes** — move the user to a lower place, split an
   oversized catchment area, or add supervisors so each covers less. Trade-off:
   operational/organizational, not just technical; contact-hierarchy changes ripple.
5. **Switch the user to an online role** — for supervisor/manager profiles with
   reliable connectivity. Online users don't replicate at all; the problem
   disappears. Trade-off: no offline capability whatsoever, no tasks and targets. 
6. **Turn off unallocated-record access** for the role if it isn't needed.

Anti-recommendations to state when relevant:

- Raising the 10,000 limit: impossible via configuration (hardcoded).
- Telling users to just press Continue: works once, but downloads keep growing;
  it defers the failure to a worse moment (timeout mid-sync, full device).

## Aftercare

After the deployer applies a fix, verify with the same probes: C6 should show the
reduced count immediately for config changes (purge takes effect after the next
server-side purge run — C7's `all_docs_count` vs `count` gap will widen). Suggest
they monitor `replication_limit.count` (C1) to catch the cohort-level trend.
