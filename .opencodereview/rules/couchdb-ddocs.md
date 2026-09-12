#### CouchDB design documents

`ddocs/` holds CouchDB design docs. `medic-client` replicates to every offline device. These are **not** ordinary application files — review them as database schema.

- These run inside CouchDB's own JavaScript engine, not Node. ES6+ (`let`, `const`, arrow functions, template literals, `Object.assign`, spread, optional chaining) is unsafe — this code is intentionally ES5. Flag ES6+ syntax here even though the surrounding repo uses it. Do not flag `var` in these files.
- Map functions must be pure and deterministic: no `Date.now()`, no `Math.random()`, no reliance on anything outside `doc`. A non-deterministic key makes the index inconsistent across nodes.
- Emitting a large value bloats the index; emit ids and let the caller fetch. Flag `emit(key, doc)`.
- Key shape is a contract. Changing the arity, order, or type of an emitted key breaks every existing query, including `startkey`/`endkey` ranges in `api/`, `sentinel/`, and project configuration.
