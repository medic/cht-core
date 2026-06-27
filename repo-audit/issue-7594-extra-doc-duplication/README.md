# Editing a report duplicates its additional documents

## Verdict

**Priority:** 1 of 3  
**Type:** Data-integrity bug  
**Upstream issue:** [medic/cht-core#7594](https://github.com/medic/cht-core/issues/7594)  
**Expected fix size:** 70–95 changed lines, including tests

This is a medium-sized, high-impact defect. Additional documents created with
`db-doc="true"` are widely used, and every edit of their parent report can add
another set of logically identical documents.

## Evidence in the current checkout

`webapp/src/ts/services/enketo.service.ts` uses the same conversion path for
new and existing reports:

- `xmlToDocs` starts at line 365.
- Every `[db-doc]` element receives a generated CouchDB ID around line 448.
- Every `[db-doc=true]` element is converted to a document around line 468.
- `completeExistingReport` calls `_save` at line 583.
- `_save` always calls `xmlToDocs`, with no indication that the report is an
  edit.

Consequently, an edit generates fresh IDs and returns the parent plus fresh
additional documents. `FormService.saveDocs` then sends the entire array to
`bulkDocs`, so CouchDB correctly treats those fresh IDs as new documents.

## Impact

- Repeated edits silently inflate clinical and operational datasets.
- Exports, analytics, transitions, and integrations can count one event more
  than once.
- There is no reliable generic deduplication after the fact because projects
  define their own additional-document schemas.
- The issue is tagged **Community Priority** upstream and is reported against
  a feature used by multiple projects.

## Reproduction

1. Configure a report form containing one or more `db-doc="true"` nodes.
2. Submit it and record the IDs of the generated additional documents.
3. Edit and save the parent report without changing those nodes.
4. Query CouchDB for the relevant additional-document type.
5. Observe a second set with different `_id` values.
6. Repeat the edit; the count grows again.

## Proposed solution

Adopt the safest behavior already listed in the upstream issue: additional
documents are created on initial submission only. Editing the parent updates
the parent report but neither recreates nor overwrites its additional
documents.

1. Add a `createAdditionalDocs` option to `xmlToDocs`, defaulting to `true`.
2. Pass `false` from `completeExistingReport`.
3. When false, do not assign new `_couchId` values to `db-doc` nodes, do not
   rewrite `db-doc-ref` fields, and do not append `db-doc=true` nodes to
   `docsToStore`.
4. Continue parsing the main report normally so ordinary edited fields and
   attachments are saved.
5. Add regression tests for a plain additional document and one containing
   `db-doc-ref` links. Keep the existing new-report tests unchanged to prove
   creation still works.

### Change budget

| Area | Estimated changed lines |
|---|---:|
| Edit-aware XML conversion in `enketo.service.ts` | 15–25 |
| Existing-report regression tests in `enketo.service.spec.ts` | 40–50 |
| Save-pipeline assertion in `form.service.spec.ts` | 15–20 |
| **Total** | **70–95** |

## Acceptance criteria

- A new submission still creates the parent and all configured additional
  documents.
- Editing that parent saves exactly one document: the parent report.
- Existing additional-document IDs and reference values are not replaced.
- Repeated edits do not increase the additional-document count.
- New-report, repeat, attachment, geolocation, and transition tests remain
  green.

## Important non-goal

Do not update existing additional documents from the edited form. They may
have been changed independently by Sentinel, integrations, or users; blindly
overwriting them would replace one data-integrity bug with another.
