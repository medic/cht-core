#### CouchDB design documents

`ddocs/` holds CouchDB design docs. `medic-client` replicates to every offline device. These are **not** ordinary application files — review them as database schema.

- Map functions must be pure and deterministic: no `Date.now()`, no `Math.random()`, no reliance on anything outside `doc`. A non-deterministic key makes the index inconsistent across nodes.
- Emitting a large value bloats the index; emit ids and let the caller fetch. Flag `emit(key, doc)`.
- Key shape is a contract. Changing the arity, order, or type of an emitted key breaks every existing query, including `startkey`/`endkey` ranges in `api/`, `sentinel/`, and project configuration.
