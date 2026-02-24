# Admin Tool

## Project Overview

`admin-tool` is an Angular 19 application that replaces the legacy AngularJS 1.x `/admin` app as part of an incremental migration strategy. It provides the administrative interface for CHT (Community Health Toolkit) instances, covering configuration, user management, data export, system upgrades, and other operational concerns.

The migration is feature-by-feature: the new app is built in parallel with the existing admin until all sections are fully ported. The current state is **Milestone 1 — Application Skeleton**: the full build toolchain is in place, the layout shell (header + sidebar + router outlet) is rendered, and all 11 navigation sections exist as route stubs ready to be filled in.

The app is a standalone Angular application (no NgModules for components), uses hash-based routing, and outputs its build artifacts to `../api/build/static/admin-tool` alongside the existing apps.

---

## Tech Stack

| Concern | Library | Version |
|---|---|---|
| Framework | Angular (standalone) | 19.1.7 |
| State management | NgRx Store + Effects | ^19.0.1 |
| Routing | Angular Router (hash-based) | 19.1.7 |
| HTTP | Angular HttpClient | 19.1.7 |
| Internationalisation | @ngx-translate/core | ^16.0.4 |
| CSS preprocessor | LESS | ^4.2.2 |
| CSS framework | Bootstrap | ^3.4.1 |
| Icons | Font Awesome | ^4.7.0 |
| Dropdown widgets | Select2 | 4.0.13 |
| DOM utilities | jQuery | 3.5.1 |
| Cookies | ngx-cookie-service | ^19.1.2 |
| Reactive programming | RxJS | ^7.8.2 |
| Build | @angular-builders/custom-webpack | ^19.0.0 |
| TypeScript | typescript | ~5.7.0 |
| Test runner | Karma + ChromeHeadless | ^6.4.2 |
| Test framework | Mocha + Chai + Sinon | ^11 / ^4 / ^21 |
| Linter | ESLint (monorepo root config) | ^9.36.0 |
| Formatter | @stylistic/eslint-plugin | (via root config) |

---

## Commands

All commands are run from the `admin-tool/` directory unless noted otherwise.

### Install dependencies

```bash
npm install
```

> A `.npmrc` with `legacy-peer-deps=true` is present to resolve a peer conflict between `zone.js ^0.16.x` and the Angular 19.1.7 peer requirement.

### Lint

```bash
npm run lint
```

Runs ESLint against `src/` and `tests/` using the monorepo-root flat config (`../eslint.config.js`). No separate formatter step is needed — code style (indentation, quotes, semicolons, line length) is enforced by `@stylistic/eslint-plugin` rules within ESLint itself.

To lint the entire monorepo (including admin-tool) from the repo root:

```bash
# from medic-cht-core/
npm run lint
```

### Unit tests

```bash
npm run unit
```

Runs all `tests/karma/**/*.spec.ts` files in ChromeHeadless via Karma + Mocha. Coverage is collected and written to `tests/karma/coverage/`. The build will fail if coverage drops below the enforced thresholds:

| Metric | Threshold |
|---|---|
| Statements | 95% |
| Lines | 95% |
| Functions | 95% |
| Branches | 85% |

### Development build (watch mode)

```bash
npm run build-watch
```

Incrementally rebuilds on file changes with source maps enabled and no output hashing. Output goes to `../api/build/static/admin-tool`.

### Production build

```bash
npm run build
```

Equivalent to `ng build --configuration=production`. Enables AOT, minification, and license extraction. Budgets: 6 MB initial bundle, 10 KB per component style.

### Dev server

```bash
npm run start
```

Starts `ng serve` on `http://localhost:4200` with live reload. Proxies are not configured at this stage; the app is expected to be served behind the CHT API in production.

---

## Project Structure

```
admin-tool/
├── .npmrc                          # legacy-peer-deps=true (zone.js compat)
├── angular.json                    # Angular CLI + custom-webpack config
├── custom-webpack.config.js        # jQuery dedup alias, path/fs fallbacks
├── package.json
├── tsconfig.json                   # Base TS config, path aliases
├── tsconfig.app.json               # App build (adds @types/node for require())
├── tsconfig.spec.json              # Test build (adds mocha/sinon/chai types)
│
├── src/
│   ├── index.html                  # Shell HTML, <app-root> mount point
│   │
│   ├── css/
│   │   ├── main.less               # Entry point: imports all partials
│   │   ├── variables.less          # Design tokens (colors, layout, typography)
│   │   ├── theme.less              # Admin-specific layout (header, sidebar, content)
│   │   └── common.less             # Shared base styles
│   │
│   └── ts/
│       ├── main.ts                 # bootstrapApplication() entry point
│       ├── polyfills.ts            # zone.js, localize, Window type augmentation
│       ├── app.component.ts        # Root component — renders <app-main-layout>
│       ├── app.config.ts           # ApplicationConfig: providers, routing, store, i18n
│       ├── app-routing.module.ts   # All 11 lazy routes + default/wildcard redirects
│       │
│       ├── environments/
│       │   ├── environment.ts      # Dev environment flags
│       │   └── environment.prod.ts # Production environment flags
│       │
│       ├── components/
│       │   ├── header/             # HeaderComponent — brand + logout (stub)
│       │   └── sidebar/            # SidebarComponent — 11 nav links with routerLinkActive
│       │
│       └── modules/
│           ├── shell/              # MainLayoutComponent — fixed header + sidebar + <router-outlet>
│           ├── display/            # stub
│           ├── users/              # stub
│           ├── authorization/      # stub
│           ├── sms/                # stub
│           ├── forms/              # stub
│           ├── targets/            # stub
│           ├── images/             # stub
│           ├── message-queue/      # stub
│           ├── upgrade/            # stub
│           ├── export/             # stub
│           └── backup/             # stub
│
└── tests/
    └── karma/
        ├── test.ts                 # Karma entry: TestBed init, chai plugins
        ├── karma-unit.base.conf.js # Karma config (coverage thresholds, reporters)
        ├── karma-unit.conf.js      # Extends base, sets singleRun: true for CI
        └── ts/
            ├── app.component.spec.ts
            ├── app.config.spec.ts
            ├── app-routing.module.spec.ts
            ├── components/
            │   ├── header/header.component.spec.ts
            │   └── sidebar/sidebar.component.spec.ts
            └── modules/
                ├── shell/main-layout.component.spec.ts
                ├── display/
                ├── users/
                ├── authorization/
                ├── sms/
                ├── forms/
                ├── targets/
                ├── images/
                ├── message-queue/
                ├── upgrade/
                ├── export/
                └── backup/
```

### TypeScript path aliases

All imports within `src/ts/` use the `@admin-tool-*` prefix to avoid relative `../../` chains:

| Alias | Resolves to |
|---|---|
| `@admin-tool-actions/*` | `src/ts/actions/*` |
| `@admin-tool-components/*` | `src/ts/components/*` |
| `@admin-tool-directives/*` | `src/ts/directives/*` |
| `@admin-tool-effects/*` | `src/ts/effects/*` |
| `@admin-tool-environments/*` | `src/ts/environments/*` |
| `@admin-tool-modules/*` | `src/ts/modules/*` |
| `@admin-tool-pipes/*` | `src/ts/pipes/*` |
| `@admin-tool-providers/*` | `src/ts/providers/*` |
| `@admin-tool-reducers/*` | `src/ts/reducers/*` |
| `@admin-tool-selectors/*` | `src/ts/selectors/*` |
| `@admin-tool-services/*` | `src/ts/services/*` |

---

## Style Approach

### Preprocessor

LESS is used exclusively — no SCSS. This matches both the legacy `/admin` app and the `/webapp`.

### File layout

| File | Role |
|---|---|
| `variables.less` | Single source of truth for all design tokens. Imported as `(reference)` so tokens are available everywhere without emitting duplicate CSS. |
| `theme.less` | Admin-specific structural styles: fixed navbar, sidebar (220 px), content area, active nav state, loader, responsive breakpoints. |
| `common.less` | Shared utility classes and base resets. |
| `main.less` | Entry point only — imports everything in order, no own rules. |

### Third-party CSS

Bootstrap 3 and Font Awesome 4 are imported from `node_modules` using **relative paths** (`../../node_modules/...`). The font path variables (`@icon-font-path`, `@fa-font-path`) are overridden before the imports so that webpack resolves glyph font files correctly regardless of the compilation context.

### Key design tokens

```less
// Layout
@nav-width:          220px;
@admin-content-width: 1440px;

// Admin header
@header-bg:          #323232;   // dark charcoal
@header-text-color:  #FFFFFF;

// Active nav item
@nav-active-bg:      #d9d9da;
@nav-active-border:  #797979;
@nav-active-color:   #38464d;

// Breakpoints
@media-tablet:       985px;
@media-mobile:       767px;     // sidebar hidden below this
```

### Responsive behaviour

The sidebar is visible at all viewport widths above `@media-mobile` (767 px). Below that breakpoint it is hidden via `display: none` and the content area fills the full width with no left margin. No hamburger menu is implemented in Milestone 1.

### Conventions

- 2-space indentation (enforced by `@stylistic/indent`).
- Single quotes for strings (enforced by `@stylistic/quotes`).
- Maximum line length 120 characters (enforced by `@stylistic/max-len`).
- Component styles live in the global LESS files for now; component-level `styleUrls` are not used in stub modules.
