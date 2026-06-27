# Purging loads the entire `_users` database into Sentinel memory

## Verdict

**Priority:** 3 of 3  
**Type:** Memory and scalability defect  
**Upstream issue:** [medic/cht-core#11088](https://github.com/medic/cht-core/issues/11088)  
**Validated fix size:** 80 changed lines, including tests

This is a bounded medium-sized fix with production impact. The active upstream
patch reports 72 additions and 8 deletions across the implementation and its
unit tests, exactly matching the requested 50–100 line range.

## Evidence in the current checkout

`sentinel/src/lib/purging.js:65` defines `getRoles`. At line 69 it executes:

```js
db.users.allDocs({ include_docs: true })
```

There is no `limit`, `startkey`, or other cursor. CouchDB therefore returns
every user document in one response. The loop only reads `doc.roles`, but the
query materializes complete documents, including authentication fields, in
Sentinel's heap.

This is inconsistent with the same module's contact and record purge paths,
which already use batch limits and cursor-based iteration.

## Impact

- Peak memory grows linearly with the total number of users.
- A purge cycle can create a large temporary allocation on deployments with
  thousands of community health workers.
- Garbage collection pressure can slow Sentinel's transition and scheduled
  work; at sufficient scale the process can be terminated for out-of-memory.
- Full authentication documents are held in memory even though only role
  arrays are required.

## Reproduction

1. Configure server-side purging.
2. Populate `_users` with several thousand representative user documents.
3. Capture Sentinel heap usage before and during a purge cycle.
4. Observe one unbounded `_users/_all_docs?include_docs=true` response and a
   corresponding memory spike.
5. Increase the user count; peak allocation rises with it.

## Proposed solution

Paginate `_users` while retaining only the deduplicated role groups:

1. Add a `USERS_BATCH_SIZE` constant, initially 1,000.
2. Request `include_docs`, `limit`, `startkey`, and `skip` in a loop.
3. Process each page immediately into the existing `dedupedByRoles` map.
4. Use the final row ID as the next cursor and `skip: 1` to avoid processing
   the boundary document twice.
5. Stop after a short page or an empty page.
6. Preserve error propagation so a failed page aborts the purge rather than
   returning an incomplete role map.

### Validated change budget

| Area | Changed lines |
|---|---:|
| Pagination in `sentinel/src/lib/purging.js` | Included below |
| Updated and new tests in `sentinel/tests/unit/lib/purging.spec.js` | Included below |
| **Total from upstream patch #11089** | **80** |

## Acceptance criteria

- No `_users` request omits `limit`.
- Multiple pages produce the same role-hash map as a single page.
- Role sets duplicated across page boundaries remain deduplicated.
- Empty, malformed, online-only, and role-less user documents remain ignored.
- A rejection from any page is propagated.
- The maximum raw user-document working set is one page.

## Test cases

- One page smaller than the batch limit.
- Exactly one full page followed by an empty page.
- Two pages with duplicate role combinations across the boundary.
- An error on the second page.
- Verification of `startkey`, `skip`, `limit`, and `include_docs` on every
  request.