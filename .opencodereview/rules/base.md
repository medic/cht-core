#### cht-core baseline

Applies on top of the generic checklist above. Where the two disagree, this section wins.

#### CouchDB / PouchDB document handling

- **Update conflicts.** A `put` on a doc fetched earlier can fail with a 409 whenever sentinel, replication, or another request may touch the same doc. Flag a write with no 409 branch and no retry where concurrent writes are plausible (contacts, reports, the `settings` doc, user docs).
- **`bulkDocs` does not throw per row.** It resolves with an array where an individual row may carry `error` / `status`. Flag a `bulkDocs` result that is never inspected for failed rows — the failure is silently swallowed.
- **Unbounded reads.** `allDocs` / `db.query` / `db.find` with no `limit`, or a view read materialised into an array, is a scale problem on real deployments. Flag it when the result set grows with deployment size (contacts, reports, tasks, messages). A bounded lookup by a known set of ids is fine.
- **Property naming.** Properties persisted on CouchDB docs are `snake_case`; everything else is `lowerCamelCase`. A new persisted doc property in `camelCase` is a finding.
- **Shared constants.** Doc ids, doc types, contact types, user roles, and HTTP headers live in `@medic/constants` (`shared-libs/constants`). A re-declared string literal that already exists there is a finding; a genuinely new one belongs in that package.

#### Security and access control

- `api/src/services/replication/authorization.js` and `api/src/middleware/authorization.js` decide what an offline  user may replicate and what an online user may call. Any change that widens the doc set an offline user can read or write, or that relaxes a role/permission check, is a high-severity finding unless the PR explicitly says that widening is the goal.
- A new route in an `api/src/controllers/*` file that omits the permission or authentication check its siblings in the same controller apply is a finding.
- User-supplied values reaching a CouchDB view key, a `_find` selector, a shell command, or a URL built by string concatenation must be validated or encoded first.
