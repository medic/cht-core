#### webapp — Angular + NgRx

`webapp/src/ts/` is Angular (standalone-less modules) with NgRx for state and RxJS throughout. Ignore every React item in the generic checklist above — there is no React in this repo.

**Subscription lifetime.** The convention here is a single `private subscription: Subscription = new Subscription()` field, `this.subscription.add(...)` for every stream, and `this.subscription.unsubscribe()` in `ngOnDestroy`. Flag:

- a new `.subscribe(...)` whose teardown is not added to that subscription (or handled by `takeUntil` / `async` pipe);
- a component that gains its first subscription but no `ngOnDestroy`;
- a `ChangesService.subscribe(...)` left unregistered — those fire for the life of the session.

**NgRx.**

- Reducers and selectors must stay pure — no `Date.now()`, no service calls, no mutation of the incoming state.  Mutating a state slice in place instead of returning a new object is a real bug, not a style note.
- An effect that can throw or reject without a `catchError` inside the inner observable kills the effect stream for the rest of the session. Flag `catchError` placed on the outer pipe instead of inside the `switchMap`/`mergeMap`.
- `switchMap` where in-flight work must not be cancelled (a save, a delete), or `mergeMap` where only the latest result is wanted (a search-as-you-type) — say which you believe the intent is when reporting.
- New state read directly from a service in a component where a selector already exposes it.

**Change detection and rendering.**

- Work done in a template expression or a getter bound in the template runs on every change-detection pass; flag anything non-trivial there.
- `innerHTML` bound to a value that can carry user or configuration content without sanitisation.
- A `setTimeout` / `setInterval` started in a component and never cleared in `ngOnDestroy`.

**Internationalisation.** Every user-facing string goes through the translate pipe/service and `api/resources/translations/messages-en.properties`. A literal English string in a template or in a value rendered to the user is a finding. Layout must also survive RTL — flag a hardcoded `left`/`right` (margin, padding, position, `text-align`) where a logical property or the existing RTL handling should be used.

**Types.** `webapp/src/ts` is TypeScript; a new `any` without a comment explaining why, or a type assertion that papers over a genuinely nullable value, is worth reporting.
