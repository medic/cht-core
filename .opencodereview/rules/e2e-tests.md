#### E2E and integration test review rules

These files are test code. The rules below override the generic checklist for them.

**Never report in these files:**

- Hardcoded literals in fixtures, expected values, doc ids, phone numbers, and URLs.
- Setup repeated across specs, or a long `before`/`beforeEach`.
- Missing error handling
- Use of `browser.*` globals without an import; WebdriverIO injects them.

Report what makes a test **flaky, unable to fail, leaky across suites, or asserting the wrong thing**.

#### Flakiness

- **`browser.pause(n)` as a synchronisation primitive.** A fixed sleep standing in for a real wait is the main source of flake in this suite. Flag it and name the `waitForDisplayed` / `waitForClickable` / `browser.waitUntil` condition that should replace it. A pause used to let an animation settle *after* a wait is acceptable.
- An assertion on an element that was never waited for — `getText()` / `isDisplayed()` straight after a navigation or a click that triggers a re-render.
- `browser.waitUntil` whose predicate can never become false (it will pass immediately or hang for the full timeout with an unhelpful message).
- Reading a value once and asserting on it inside `waitUntil` — the predicate must re-read the element each poll.
- A hardcoded index into a list whose order the test does not control.
- Depending on sentinel having processed a doc without `utils.waitForDocRev`, `utils.runSentinelTasks`, or an equivalent wait. Sentinel is asynchronous; "save then immediately assert" is a race.
- Depending on a CouchDB view being current without `utils.waitForIndexes`.

#### Leaking state between suites

- Settings changed with `utils.updateSettings` / `utils.updatePermissions` and not reverted with `utils.revertSettings` (or `utils.revertDb`) in `after`/`afterEach`. The next suite inherits them.
- Docs or users created and never cleaned up — `utils.deleteAllDocs`, `utils.deleteUsers`, `utils.revertDb`.
- A service stopped (`utils.stopSentinel`, `utils.stopApi`, `utils.stopHaproxy`) on a path that can throw before the matching start, leaving the rest of the run against a dead instance.
- Cleanup placed in the `try` of the test body rather than in an `after` hook, so a failing assertion skips it.

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

#### Page objects
- Selectors and waits belong in `tests/page-objects/**`; assertions belong in the spec. A raw `$('...')` selector or a `waitForDisplayed` inline in a spec, where the page object already exposes (or should expose) it, is a finding.
- A brittle selector (deep CSS descent, `nth-child`, text match on untranslated copy) where a stable hook exists.
