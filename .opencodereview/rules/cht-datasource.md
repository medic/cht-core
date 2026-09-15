#### cht-datasource — versioned public API

`shared-libs/cht-datasource` exposes a **versioned public API** consumed not only across cht-core but by customer configuration code — purging, tasks, targets, contact-summary. Treat its exported surface as a published contract.

**Only passive changes to an existing version** (see `shared-libs/cht-datasource/README.md`). Report as a breaking change, with the version bump as the fix:

- removing or renaming an export, a function, a parameter, or a returned field;
- narrowing a parameter type or widening a return type;
- making an optional parameter required, or reordering parameters;
- changing what a function returns for input that previously succeeded — including throwing where it used to return `null`, or returning `null` where it used to throw;
- changing page size, ordering, or the shape of a paginated result.

A non-passive change belongs on a new version of the API; the previous version stays, marked `@deprecated`, and internal cht-core callers move to the new one. Flag a new version added without the `@deprecated` marker on the old one, or without the internal callers updated.

**Both adapters, or neither.** Every interaction exists twice: `src/local/` (PouchDB — offline webapp users, api, sentinel) and `src/remote/` (HTTP proxy to api — admin, online webapp users). A change to one adapter without the matching change to the other is a real bug: the same call will behave differently for offline and online users. Check that the two agree on returned shape, null handling, and error behaviour.

**Four levels for a new interaction** — flag any that is missing:

1. implemented in `src/local/` **and** `src/remote/`;
2. a unified interface exposed from the concept module (`src/person.ts`, `src/place.ts`, `src/contact.ts`, `src/report.ts`, `src/target.ts`);
3. exported from `src/index.ts`;
4. the endpoint the remote adapter calls implemented in `api/`. A path or query-parameter change must match the api route it calls.
