# `@medic/cht-fhir` — FHIR facade configuration

CHT's FHIR facade serves CHT documents as FHIR R4 resources, read-only, at
`/api/v1/fhir`. It is driven by one configuration block, and this file is its
reference.

It serves three resource types: **Patient**, **Encounter** and the
**Observation**s an Encounter projects. Elements that reference other types
(Practitioner, Location, Organization) still emit correct references, but this
server does not resolve them.

The mapping is **constrained, not arbitrary**: a configuration picks CHT
sources for elements this library already knows how to build. You cannot
invent an element; you can only bind one from [the catalog](#elements).

The normative sources are `src/config.ts` (schema and validation),
`src/catalog.ts` (resource types and element rows) and `src/query.ts` (query
planning). If you change any of them, update the matching section here.

## Where the configuration lives

The configuration is `app_settings.fhir`. [`fhir-mapping.example.json`](fhir-mapping.example.json)
is a worked example; its entire contents go into `app_settings.fhir` as they
are. The format is the one `cht-ui-builder` writes, and keys this library does
not use are ignored.

api calls `loadConfig()` and caches the result until the settings object
changes. `loadConfig` never throws; a mistake becomes a **diagnostic**, which
api logs whenever the settings change. The blast radius is scoped:

| Where the error is | What is lost |
| --- | --- |
| `facade.resources` or `facade.canonicalBase` missing | The whole facade. Endpoints answer `503`. |
| Anything wrong with a binding itself | That binding only. Every other binding keeps serving. |

With no `fhir` key at all, the facade endpoints answer `404`.

## Access

Every endpoint needs an **online** user with the `can_access_fhir_api`
permission. It is not granted to any role by default.

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/fhir/metadata` | The CapabilityStatement: served resource types and their search parameters. |
| `GET /api/v1/fhir/<Type>` | A searchset Bundle. |
| `GET /api/v1/fhir/<Type>/<id>` | One resource. |

Errors are OperationOutcomes.

## Top-level shape

```jsonc
{
  "facade": {
    "canonicalBase": "https://example.org/api/v1/fhir",  // required
    "resources": { "<bindingKey>": { /* binding */ } }    // required
  },
  "questionMappings": { "<questionKey>": { "system": "…", "code": "…", "display": "…" } },
  "adHocCodeSystem": { "canonical": "…", "codes": { "<questionKey>": { "code": "…", "display": "…" } } }
}
```

`canonicalBase` is the URL this deployment's FHIR service is published at.
`{base}` in an identifier `system` resolves to it. It is part of permanent
public identifiers, so the facade will not invent one.

## Binding keys

Each key of `facade.resources` is `<ResourceType>/<sourceKind>/<sourceId>`:

| Resource type | Key | Notes |
| --- | --- | --- |
| Patient | `Patient/contact_type/person` | A **person** contact type, read through `Person.v1`. **Only one** Patient binding is served (`patient-binding-duplicate`). |
| Encounter | `Encounter/form/app:pregnancy` | Any number. Everything up to the first `:` is stripped to match a report's `form`. |
| Observation | — | Never bound; projected from an Encounter binding's `observations`. |

A binding is:

```jsonc
{
  "status": "active",      // "disabled" or "orphaned" is not served
  "sourceFilter": null,    // narrow the document set
  "elements": {},          // elementId -> { source }
  "identifiers": [],       // Patient business identifiers
  "observations": {}       // questionKey -> projection (Encounter only)
}
```

## Sources and filters

| Kind | Shape | Resolves to |
| --- | --- | --- |
| `doc` | `{ "kind": "doc", "path": "doc.phone" }` | A path on the CHT document. A leading `doc.` is optional. |
| `field` | `{ "kind": "field", "path": "vitals.weight_kg" }` | A path relative to `doc.fields`. |
| `const` | `{ "kind": "const", "value": "finished" }` | A literal. |
| `coding` | `{ "kind": "coding", "system": "…", "code": "…", "display": "…" }` | A literal coded concept, for a CodeableConcept element. `display` is optional. |

Blank values are omitted rather than emitted empty. A path that lands on a list
(an XLSForm repeat group) is omitted with a warning rather than served as
`"[object Object]"`.

A `sourceFilter` narrows the documents a binding claims, for a contact type
coarser than the FHIR resource — one `person` type separating patients from
CHWs on `doc.role`, say:

```json
"sourceFilter": { "source": { "kind": "doc", "path": "doc.role" }, "op": "eq", "value": "patient" }
```

`op` is `eq` or `ne` (string `value`), `in` (array of strings), or `exists` or
`not-exists` (no `value`).

## Elements

`elements` maps an element id to `{ "source": … }`. An element id is a
pseudo-path: `Patient.telecom.phone` means "the ContactPoint on
`Patient.telecom` whose system is `phone`". The catalog is closed: an unknown
element (`element-unknown`) or a source kind the element does not accept
(`element-source-kind-rejected`) drops the binding.

### Patient

| Element | Accepts | Notes |
| --- | --- | --- |
| `Patient.name.text` | `doc` | |
| `Patient.name.family` | `doc` | |
| `Patient.name.given` | `doc` | |
| `Patient.gender` | `doc` | Lowercased; anything outside `male`, `female`, `other`, `unknown` is dropped with a warning. |
| `Patient.birthDate` | `doc` | Unpadded CHT dates (`1991-11-6`) are padded. |
| `Patient.telecom.phone` | `doc` | |
| `Patient.address.text` | `doc`, `field` | |
| `Patient.deceasedDateTime` | `doc` | |
| `Patient.managingOrganization` | `doc` | `Organization/<value>` |

### Encounter

| Element | Accepts | Notes |
| --- | --- | --- |
| `Encounter.status` | `const` | **Required.** An R4 encounter status, normally `finished`. |
| `Encounter.class` | `const` | **Required.** A v3-ActCode, normally `HH`. |
| `Encounter.period.start` | `doc`, `field` | Also each projected Observation's `effectiveDateTime`. |
| `Encounter.period.end` | `doc`, `field` | |
| `Encounter.type` | `const`, `field`, `coding` | A `const` or `field` emits `{ text }` only; use `coding` for a code. |
| `Encounter.subject` | `doc`, `field` | `Patient/<value>`. Also each projected Observation's `subject`. |
| `Encounter.participant.individual` | `doc` | `Practitioner/<value>` |
| `Encounter.location.location` | `doc`, `field` | `Location/<value>` |
| `Encounter.reasonCode` | `field`, `const`, `coding` | |

Every mapped resource carries `id` (the document `_id`), `meta.versionId` (its
`_rev`) and `meta.lastUpdated` (its `reported_date`, which for a contact is its
creation date rather than its last edit).

## Identifiers

`identifiers` is an array, emitted in order:

```json
{
  "system": "{base}/identifier/patient-id",
  "use": "official",
  "type": { "system": "http://terminology.hl7.org/CodeSystem/v2-0203", "code": "MR", "display": "Medical record number" },
  "source": { "kind": "doc", "path": "doc.patient_id" }
}
```

`system` and `source` are required; `use` and `type` are optional.

## Observations

Observations are projected out of an **Encounter** binding: one form field
becomes one Observation. `observations` is keyed by a question key, which is
also the key into `questionMappings` or the ad-hoc codes:

```json
"observations": {
  "app:pregnancy/weeks_since_lmp": {
    "include": true,
    "codeSource": "ad-hoc",
    "valueMode": "valueQuantity",
    "unit": { "system": "http://unitsofmeasure.org", "code": "wk", "display": "wk" },
    "source": { "kind": "field", "path": "weeks_since_lmp" }
  }
}
```

| Field | Notes |
| --- | --- |
| `include` | Anything but `true` is skipped, as is `"status": "orphaned"`. |
| `codeSource` | **Required.** `question-mapping` (a standard code from `questionMappings`) or `ad-hoc` (a locally minted one from `adHocCodeSystem`). |
| `source` | **Required.** Report answers nest by form group, so the question key does not say where the answer is. |
| `valueMode` | `auto` (default), `valueQuantity`, `valueString`, `valueBoolean`, `valueDateTime`, `valueCodeableConcept` (carried as `{ text }`). |
| `unit` | `{ system, code, display }`; forces `valueQuantity` under `auto`. |

`auto` infers, in order: a `unit` → `valueQuantity`; a boolean (`yes`/`no`,
`true`/`false`, `1`/`0`) → `valueBoolean`; a number → `valueQuantity`; a
`YYYY-MM-DD…` string → `valueDateTime`; otherwise `valueString`.

Each Observation gets `id` `<reportUuid>.<code>`, `status` `final`, category
`survey`, `encounter` `Encounter/<reportUuid>`, `subject` from
`Encounter.subject` (without it you get `observation-subject-missing` and
subject-less Observations), and `effectiveDateTime` from
`Encounter.period.start`, falling back to `reported_date`.

Ad-hoc codes must be **minted by the configuration tool**; the facade will not
derive one from a field name, because a published code must not change when a
field is renamed. An unminted ad-hoc code is an error; an unmapped standard code
is a warning, and that Observation is not served. A question mapping with
`"status": "skipped"` counts as unmapped.

Codes must match `[A-Za-z0-9\-.]` (`observation-code-not-id-safe`), be at most
27 characters (`observation-code-too-long`, since a CHT uuid takes up to 36 of
the 64 a FHIR id allows) and be distinct within a binding
(`observation-code-duplicate`).

## How documents are found

Every query is a [cht-datasource](../cht-datasource) call; the facade queries
no view directly. There is no `query` configuration: cht-core owns the plan.

| Request | Call |
| --- | --- |
| Read | `Person.v1.get` / `Report.v1.get` by uuid |
| `GET /Patient` | `Person.v1.getPage(byContactType)` |
| `GET /Patient?name=` | `Contact.v1.getUuidsPage(byFreetext and byContactType)`, then `getPage(byIds)` |
| `GET /Encounter`, `GET /Observation` | `Report.v1.getUuidsPage(byForms)` over every bound form, then `getPage(byIds)` |

| Resource type | Search parameters |
| --- | --- |
| Patient | `_id`, `name` (free text, at least 3 characters) |
| Encounter | `_id` |
| Observation | `_id`, `encounter` |

Any other parameter is a `400`. Paging is `_count` (default 50, max 500) plus an
opaque `_cursor`: follow `Bundle.link[relation=next]` verbatim. For
Observation, `_count` counts reports, and each report projects to several
Observations.

## Diagnostics reference

Severity `error` drops what it names; `warn` and `info` are informational.

| Rule id | Severity | Meaning |
| --- | --- | --- |
| `facade-missing` | error | `facade.resources` is missing. Disables the facade. |
| `canonical-base-missing` | error | `facade.canonicalBase` is missing. Disables the facade. |
| `no-servable-bindings` | error | Every binding was dropped. Disables the facade. |
| `binding-key-invalid` | error | The key is not `Type/kind/id`. |
| `binding-malformed` | error | The binding is not an object. |
| `binding-source-kind-mismatch` | error | The key's source kind is not the one the resource type binds to, or it is an `Observation` binding. |
| `patient-binding-duplicate` | error | A second Patient binding. |
| `source-malformed`, `source-kind-unknown` | error | A source is missing its path or value, or names an unsupported kind (including `expr`). |
| `source-filter-malformed`, `source-filter-op-unknown`, `source-filter-value-invalid` | error | `sourceFilter` problems. |
| `identifiers-malformed`, `identifier-malformed` | error | Identifier problems. |
| `element-unknown`, `element-source-kind-rejected` | error | See [Elements](#elements). |
| `required-element-unbound` | error | `Encounter.status` or `Encounter.class` is not bound. |
| `observations-host-invalid` | error | `observations` on something other than an Encounter. |
| `observations-malformed`, `observation-malformed`, `observation-code-source-unknown` | error | Observation problems. |
| `observation-adhoc-code-unminted` | error | An ad-hoc code was never minted. |
| `observation-code-not-id-safe`, `observation-code-too-long`, `observation-code-duplicate` | error | See [Observations](#observations). |
| `observation-code-unmapped` | warn | No code for the question; its Observation is not served. |
| `observation-subject-missing` | warn | Observations on a binding with no `Encounter.subject`. |
| `binding-inactive` | info | `status` is `disabled` or `orphaned`. |

## Development

```bash
npm run --prefix shared-libs/cht-fhir build   # dependents import dist/, so rebuild after src changes
npm run --prefix shared-libs/cht-fhir test
```

The library is pure: config plus a CHT document in, a FHIR resource or a query
*plan* out. No I/O, no clock, no database. `api/src/services/fhir.js` executes
the plans and `api/src/controllers/fhir.js` speaks HTTP.
