#### admin — AngularJS

`admin/src/js/` is the legacy AngularJS ("App Management") app, CommonJS modules. It is in maintenance mode:
prefer the smallest change that fits the surrounding code over any modernisation. Ignore every React item in the
generic checklist — there is no React here.

- **Digest-cycle safety.** Work that mutates scope from outside AngularJS (a `Changes` callback, a raw promise, a DOM event) needs `$scope.$apply` / `$timeout`, and calling `$apply` while a digest is already in progress throws. Flag either mistake.
- **Watchers and listeners.** `$scope.$watch` and `$scope.$on` are removed with their scope and need no cleanup. Subscriptions and listeners that outlive the scope do: a `Changes({ key, callback })` subscription (call its `unsubscribe`), `$rootScope.$on`, `setInterval` / `$interval`, and jQuery or DOM handlers on elements outside the directive. Registering one of these without a matching cleanup on `$scope.$on('$destroy', …)` leaks for the session.
- **Injection.** New dependencies must appear in the explicit `$inject` / array-notation annotation; relying on parameter names breaks under minification.
- Do not suggest migrating this code to Angular, TypeScript, or ES modules.
- User-facing strings must be translated; RTL layout must hold.
