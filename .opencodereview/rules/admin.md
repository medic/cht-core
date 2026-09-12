#### admin — AngularJS

`admin/src/js/` is the legacy AngularJS ("App Management") app, CommonJS modules. It is in maintenance mode:
prefer the smallest change that fits the surrounding code over any modernisation. Ignore every React item in the
generic checklist — there is no React here.

- **Digest-cycle safety.** Work that mutates scope from outside AngularJS (a `ChangesService` callback, a raw promise, a DOM event) needs `$scope.$apply` / `$timeout`, and calling `$apply` while a digest is already in progress throws. Flag either mistake.
- **Watchers and listeners.** `$scope.$watch`, `$scope.$on`, `ChangesService.subscribe`, `setInterval`, and jQuery handlers registered without a matching cleanup on `$destroy` leak for the session.
- **Injection.** New dependencies must appear in the explicit `$inject` / array-notation annotation; relying on parameter names breaks under minification.
- Do not suggest migrating this code to Angular, TypeScript, or ES modules.
- User-facing strings must be translated; RTL layout must hold.
