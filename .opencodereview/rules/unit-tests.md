#### Unit test review rules

These files are test code. The rules below override the generic checklist for them.

**Never report in these files:**

- Hardcoded literals in fixtures, expected values, doc ids, phone numbers, and URLs
- Setup repeated across specs, or a long `before`/`beforeEach`.
- Missing error handling
- `any`, non-null assertions, and loose types in fixtures and stubs.
- A long `describe` or a long assertion list. Length alone is not a finding.

Report what makes a test **flaky, unable to fail, leaky across suites, or asserting the wrong thing**.

#### Tests that cannot fail

- An assertion inside a callback the code under test never invokes, after an early `return`, or in a `catch` with no preceding fail-fast assertion.
- An `async` `it` whose promise is neither returned nor awaited, or a missing `await` on the call under test — the assertions run after the test has already passed.
- An expected-failure test that runs the code but never asserts the rejection, via `await expect(...).to.be.rejectedWith(...)`, a `try`/`catch` with `assert.fail()` in the `try`, or an explicit error assertion.
- Assertions that hold regardless of behaviour: `to.exist` on a literal, a value compared to itself, or asserting how a stub was configured instead of how it was called.
- A `done` callback that is never called on the failure path, or is called alongside a returned promise.

#### Wrong assertions

- The assertion does not match what the test name claims.
- `calledWith` / `args[n]` omitting an argument the behaviour depends on, or checking the wrong call index — prefer `to.deep.equal(stub.args[0])` over a partial match when the full argument list matters.
- `deep.include` / `chai-shallow-deep-equal` / `excluding(...)` used where the claim requires exact equality; an `excluding` list that quietly hides the field the change actually affects.
- The function under test is itself stubbed, so only the stub is verified.
- `deepEqualInAnyOrder` used where order is part of the contract (sorted results, sequence of doc writes).

#### Sinon hygiene

- `sinon.stub(obj, 'fn')` must be undone. These suites call `sinon.restore()` in `afterEach` — a new file, or a new `describe` that stubs a module or object method without one, leaks the stub into every later test in the run.
- `onCall(n)` / `resolves` queues shorter than the number of calls the code under test makes, leaving a later call returning `undefined`.

#### Coverage without verification
Watch for tests written to satisfy coverage gates rather than to verify: a branch invoked but its outcome never asserted, or only "did not throw" asserted where the branch has an observable result.
