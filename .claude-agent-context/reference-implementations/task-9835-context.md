# Task Context: CHT Datasource Create/Update APIs (Issue #9835)

**Issue**: #9835
**Repository**: medic/cht-core
**Branch**: poc/add_cht_datasource_apis
**Status**: ✅ COMPLETE - All 264 integration tests passing
**Complexity**: Medium
**Category**: API Development

---

## Task Overview

### Original Requirement
Add create and update APIs to the CHT datasource library (`shared-libs/cht-datasource`) for Person, Place, and Report entities. The datasource previously only supported read operations (get/getAll).

### Why This Feature Matters
- **Consistency**: Provides uniform API for CRUD operations through datasource layer
- **Validation**: Centralizes validation logic for entity creation/updates
- **Flexibility**: Supports both programmatic (JavaScript) and REST API usage
- **Data Integrity**: Enforces immutable fields and parent relationship validation

---

## Goals Achieved

- ✅ API to create people
- ✅ API to update people
- ✅ API to create places
- ✅ API to update places
- ✅ API to create reports
- ✅ API to update reports

---

## Implementation Approach

### Dual API Strategy
The implementation provides two ways to use the APIs:

**1. Programmatic (JavaScript/TypeScript)**
```typescript
const {getLocalDataContext, Person} = require('@medic/cht-datasource');
const dataContext = getLocalDataContext(...);
const createPerson = Person.v1.create(dataContext);
await createPerson({
  type: 'patient',
  name: 'John Doe',
  reported_date: '2025-01-15T10:30:00Z'
});
```

**2. REST API**
```bash
# Create
POST /api/v1/person
Body: { "type": "patient", "name": "John Doe", ... }

# Update
PUT /api/v1/person/:uuid
Body: { "_id": "uuid", "_rev": "1-xxx", "name": "Jane Doe", ... }
```

### Architectural Pattern
- **Curried Functions**: `create = (context) => (qualifier) => Promise<Entity>`
- **Qualifiers**: Validated input objects (ContactQualifier, ReportQualifier)
- **Context Injection**: Separates data source configuration from operation
- **Type Guards**: Runtime type validation (isContactQualifier, isReportQualifier)

---

## Key Discoveries During Implementation

### Discovery 1: Hydrated vs Minimal Object Handling
**Context**: Parent and contact fields can be provided in two formats:
- Minimal: `{ parent: "uuid-string" }`
- Hydrated: `{ parent: { _id: "uuid", parent: { _id: "parent-uuid" } } }`

**Challenge**: Code needed to handle both formats seamlessly.

**Solution**: Created `extractUuid()` helper function:
```typescript
const extractUuid = (field: string | Record<string, unknown> | undefined): string | undefined => {
  if (!field) return undefined;
  if (typeof field === 'string') return field;
  if (typeof field === 'object') return field._id as string;
  return undefined;
};
```

**Impact**: Allows flexible input formats while maintaining validation integrity.

---

### Discovery 2: Parent Validation Requires Full Document
**Context**: Hydrated objects only contain `_id` and lineage, not the `type` field.

**Challenge**: Cannot validate parent type from hydrated object alone.

**Solution**: Always fetch full parent document from database for type validation:
```typescript
const parentUuid = extractUuid(qualifier.parent);
const parentDoc = await getMedicDocById(parentUuid);
const parentTypeId = contactTypeUtils.getTypeId(parentDoc);
// Now validate parentTypeId against allowed types
```

**Impact**: Ensures type validation accuracy regardless of input format.

---

### Discovery 3: reported_date Must Be Normalized
**Context**: `reported_date` can be provided as:
- ISO string: `"2025-01-15T10:30:00.000Z"`
- Unix epoch: `1736936400000`
- Undefined (auto-generate)

**Challenge**: CouchDB stores timestamps as numbers, but users often provide ISO strings.

**Solution**: Created `normalizeReportedDate()` function:
```typescript
const normalizeReportedDate = (reportedDate?: string | number): number => {
  if (reportedDate === undefined) return Date.now();
  if (typeof reportedDate === 'number') return reportedDate;
  const timestamp = new Date(reportedDate).getTime();
  if (isNaN(timestamp)) {
    throw new InvalidArgumentError(`Invalid reported_date [${reportedDate}]...`);
  }
  return timestamp;
};
```

**Impact**: Prevents ISO strings from being stored directly in database.

---

### Discovery 4: Controller Auto-Fills _id from URL
**Context**: REST API routes are `PUT /api/v1/person/:uuid`

**Finding**: API controllers automatically inject UUID from URL path as `_id` in request body:
```javascript
update: async (req, res) => {
  const { uuid } = req.params;
  const person = await updatePerson()({
    ...req.body,
    _id: uuid,  // Always injected from URL
  });
  return res.json(person);
}
```

**Impact**:
- Library-level validation of missing `_id` won't catch API errors
- URL `_id` always overrides body `_id`
- Tests expecting "missing _id" errors need different approach

---

### Discovery 5: HTTP Status Code Precision Matters
**Initial State**: All validation errors returned 400 Bad Request

**Discovery**: Different error scenarios need distinct status codes:
- **400 Bad Request**: Invalid input, validation failures
- **404 Not Found**: Document doesn't exist
- **409 Conflict**: Revision conflicts (_rev mismatch)

**Solution**: Created new error classes:
```typescript
class NotFoundError extends Error { }  // → 404
class ConflictError extends Error { }  // → 409
class InvalidArgumentError extends Error { }  // → 400
```

**Impact**: API now returns semantically correct HTTP status codes.

---

### Discovery 6: CouchDB Conflict Detection Patterns
**Context**: CouchDB returns conflicts in multiple ways:
- `{ status: 409 }`
- `{ name: 'conflict' }`
- `{ error: 'bad_request', reason: 'Invalid rev format' }`

**Challenge**: Single check pattern missed some conflict scenarios.

**Solution**: Comprehensive pattern matching:
```typescript
const isConflict = error.status === 409 ||
                   error.name === 'conflict' ||
                   error.error === 'bad_request' ||
                   (error.reason && /conflict|revision|invalid.*rev/i.test(error.reason));
```

**Impact**: Properly detects and returns 409 for all conflict types.

---

### Discovery 7: Report Reference Validation Critical for Data Integrity
**Context**: Reports reference contact/patient/place documents by UUID.

**Initial State**: No validation - reports created with non-existent references.

**Risk**: Orphaned reports with broken references, data integrity issues.

**Solution**: Added document existence validation:
```typescript
const validateDocumentExists = async (medicDb, uuid, fieldName) => {
  const doc = await getDocById(uuid);
  if (!doc) {
    throw new InvalidArgumentError(`${fieldName} document [${uuid}] not found.`);
  }
};
```

**Important Note**: Only validate minimal objects `{_id: 'uuid'}`, not fully hydrated ones (already validated).

**Impact**: Prevents creation of reports with invalid references.

---

## Contact Type Hierarchy (Critical Context)

Understanding the contact type hierarchy is essential for validation logic:

```javascript
{
  "district_hospital": {
    "parents": []  // TOP-LEVEL: No parent allowed
  },
  "health_center": {
    "parents": ["district_hospital"]  // Must have district_hospital parent
  },
  "clinic": {
    "parents": ["health_center"]  // Must have health_center parent
  },
  "person": {
    "parents": ["district_hospital", "health_center", "clinic"]  // Can have any of these
  }
}
```

**Validation Rules**:
- Top-level types (no parents defined): Parent field **not allowed**
- Child types (parents defined): Parent field **required**
- Parent must be one of the allowed types
- Parent document must exist in database

---

## Immutable Field Protection

Once created, certain fields cannot be changed during updates:

| Entity | Immutable Fields |
|--------|-----------------|
| **Person** | `type`, `reported_date`, `parent` |
| **Place** | `type`, `reported_date`, `parent`, `contact` |
| **Report** | `type`, `form`, `reported_date`, `contact` |

**Rationale**:
- `type`: Changing type would break hierarchy validation
- `reported_date`: Historical timestamp that defines document creation
- `parent`: Changing parent would break lineage integrity
- `contact`: For places, contact defines ownership (critical for permissions)
- `form`: For reports, form defines structure (cannot be changed)

**Validation Approach**:
```typescript
const immutableFields = [
  { name: 'type', current: existingDoc.type, incoming: qualifier.type },
  { name: 'parent', current: extractUuid(existingDoc.parent), incoming: extractUuid(qualifier.parent) },
  // ...
];

for (const field of immutableFields) {
  if (field.incoming !== undefined && field.current !== field.incoming) {
    throw new InvalidArgumentError(
      `Field [${field.name}] is immutable and cannot be changed. ` +
      `Current value: [${field.current}], Attempted value: [${field.incoming}].`
    );
  }
}
```

---

## Field Hydration (Automatic Lineage Building)

**Purpose**: Build complete parent/contact lineage for offline functionality.

**Input**: UUID string or minimal object
```json
{ "parent": "clinic-uuid" }
```

**Output**: Fully hydrated object with lineage
```json
{
  "parent": {
    "_id": "clinic-uuid",
    "parent": {
      "_id": "health-center-uuid",
      "parent": {
        "_id": "district-hospital-uuid"
      }
    }
  }
}
```

**Implementation Pattern**:
```typescript
const hydrateField = async (medicDb, field, fieldName) => {
  if (!field) return undefined;
  if (typeof field === 'object') return field; // Already hydrated
  if (typeof field === 'string') {
    const hydratedDoc = await fetchHydratedDoc(medicDb, field);
    return minifyLineage(hydratedDoc); // Keep only _id and parent
  }
  throw new InvalidArgumentError(`${fieldName} must be a string UUID or object`);
};
```

**Benefits**:
- Enables offline traversal of hierarchy
- Supports permission checks without additional queries
- Maintains consistency with existing CHT patterns

---

## Validation Flow Diagrams

### Create Flow
```
User Input (Qualifier)
    ↓
Type Validation (valid person/place/report type?)
    ↓
_rev Check (must NOT be present)
    ↓
Parent Validation (if applicable)
  ├─ Required? (based on type hierarchy)
  ├─ Document exists?
  └─ Correct type?
    ↓
Field Hydration (parent, contact with lineage)
    ↓
Auto-generate (reported_date if missing, _id if missing)
    ↓
Create Document in CouchDB
    ↓
Validate Created Document
    ↓
Return Entity
```

### Update Flow
```
User Input (Qualifier with _id and _rev)
    ↓
Required Fields Check (_id and _rev present?)
    ↓
Document Existence Check
    ↓
Type Validation (valid type?)
    ↓
Immutable Field Validation
  ├─ type unchanged?
  ├─ reported_date unchanged?
  ├─ parent unchanged?
  └─ contact/form unchanged? (place/report)
    ↓
Parent Validation (if parent provided)
    ↓
Field Hydration (parent, contact if changed)
    ↓
Update Document in CouchDB
    ↓
Validate Updated Document
    ↓
Return Entity
```

---

## Error Scenarios and Handling

### Common Error Patterns

**1. Validation Errors (400)**
- Missing required fields: `type`, `name`, `form`, etc.
- Invalid field values: `type not in contact_types`, `invalid date format`
- Invalid relationships: `parent type not allowed`, `parent required but missing`
- Immutable field changes: `cannot change type`, `cannot change reported_date`

**2. Not Found Errors (404)**
- Document doesn't exist: `Document [uuid] not found.`
- Referenced document missing: `parent document [uuid] not found.`

**3. Conflict Errors (409)**
- Revision mismatch: `Document update conflict` (wrong _rev)
- Invalid revision format: `Invalid rev format` (detected as conflict)

**4. Internal Errors (500)**
- Database connection failures
- Unexpected exceptions in validation logic

### Error Message Format

All errors follow consistent format:
```json
{
  "code": 400,
  "error": "Descriptive error message with [field_name] and values."
}
```

**Good Error Message Example**:
```
"Field [parent] is immutable and cannot be changed. Current value: [clinic-uuid], Attempted value: [different-uuid]."
```

**Benefits**:
- Clear identification of problem field
- Current vs attempted values shown
- Actionable for client to fix issue

---

## Testing Context

### Test Organization

**Unit Tests**: `shared-libs/cht-datasource/test/local/`
- 621 tests total
- Person: 22 create/update tests
- Place: 19 create/update tests
- Report: 20 create/update tests
- Coverage: 88.66% statements, 77.96% branches

**Integration Tests**: `tests/integration/`
- 264 tests total (API + Library)
- API Controller tests: person.spec.js, place.spec.js, report.spec.js
- Library tests: cht-datasource/person.spec.js, place.spec.js, report.spec.js

### Key Test Patterns

**Create Success Pattern**:
```javascript
it('creates person with minimal data', async () => {
  const qualifier = {
    type: 'patient',
    name: 'John Doe',
  };
  const person = await Person.v1.create(localContext)(qualifier);
  expect(person).to.have.property('_id');
  expect(person).to.have.property('_rev');
  expect(person.name).to.equal('John Doe');
});
```

**Validation Error Pattern**:
```javascript
it('throws error when parent is required but missing', async () => {
  const qualifier = {
    type: 'patient',  // Requires parent
    name: 'John Doe',
    // parent missing
  };
  await expect(Person.v1.create(localContext)(qualifier))
    .to.be.rejectedWith(InvalidArgumentError, 'parent is required');
});
```

**Immutability Test Pattern**:
```javascript
it('throws error when trying to change type', async () => {
  const qualifier = {
    _id: existingPerson._id,
    _rev: existingPerson._rev,
    type: 'different-type',  // Attempting to change
    name: 'John Doe',
  };
  await expect(Person.v1.update(localContext)(qualifier))
    .to.be.rejectedWith(InvalidArgumentError, 'Field [type] is immutable');
});
```

### Test Data Requirements

**Valid Test Fixtures**:
- `place0`: district_hospital (top-level)
- `place1`: health_center (parent: district_hospital)
- `place2`: clinic (parent: health_center)
- `contact0`: person (parent: place0)

**Valid Form Name**: `pregnancy_home_visit` (not `report0` or generic names)

**Parent Hierarchy**: Tests must respect contact type hierarchy or they fail validation

---

## Configuration Dependencies

### Contact Types Configuration
Location: `tests/config.default.json` or app settings

Structure:
```json
{
  "contact_types": [
    {
      "id": "district_hospital",
      "parents": []
    },
    {
      "id": "health_center",
      "parents": ["district_hospital"]
    }
  ]
}
```

**Used For**:
- Type validation
- Parent requirement checks
- Parent type validation
- Hierarchy enforcement

### Forms Configuration
Reports validate that `form` field references an existing form in the database.

Query: `db.query('medic-client/forms')`

**Used For**:
- Form existence validation during report creation

---

## Performance Considerations

### Database Queries Per Operation

**Create Person/Place with Parent**:
- 1 query: Fetch parent document (for type validation)
- 1 query: Fetch parent lineage (for hydration)
- 1 query: Create document
- **Total**: ~3 queries

**Update Person/Place**:
- 1 query: Fetch existing document
- 1 query: Fetch parent document (if parent validation needed)
- 1 query: Update document
- **Total**: ~3 queries

**Create Report with References**:
- 1 query: Validate form exists
- 1 query: Fetch contact document (for hydration)
- 1 query: Validate contact exists (if minimal object)
- 1 query: Create document
- **Total**: ~4 queries

**Optimization Opportunities**:
- Cache contact type configuration
- Batch validation queries
- Skip re-fetching already hydrated documents

---

## Known Limitations and Edge Cases

### Limitation 1: Remote Data Context Error Formatting
**Context**: Remote adapters (API calls) return errors in plain text format.

**Example**:
```javascript
// Local context throws: new InvalidArgumentError(message)
// Remote context returns: "Resource not found: uuid"
```

**Impact**: Integration tests for remote context need different error expectations.

**Workaround**: Remote tests check for plain error messages, not JSON format.

---

### Limitation 2: _id Validation in API Context
**Context**: REST API controllers inject `_id` from URL path.

**Example**: `PUT /api/v1/person/abc-123` always sets `_id: "abc-123"`

**Impact**: Library-level "missing _id" validation never triggers via API.

**Workaround**: API tests validate URL routing (404 when UUID missing from path) instead.

---

### Limitation 3: Deep Lineage Performance
**Context**: Deeply nested hierarchies (10+ levels) require recursive queries.

**Impact**: Performance degrades with very deep hierarchies.

**Mitigation**: CHT hierarchies typically max at 3-4 levels (district → center → clinic → person).

---

### Edge Case 1: Hydrated Object Equality
**Context**: Comparing hydrated objects for immutability check.

**Challenge**: `{_id: 'uuid', parent: {...}}` vs `{_id: 'uuid', parent: {...}}` are different objects.

**Solution**: Compare UUIDs extracted from objects, not object references:
```typescript
extractUuid(current) === extractUuid(incoming)
```

---

### Edge Case 2: Parent as Hydrated Object in Create
**Context**: User provides fully hydrated parent in create request.

**Handling**: Accept as-is (already hydrated), but still validate document exists and type matches.

**Benefit**: Avoids redundant hydration queries when data already available.

---

## Dependencies and Prerequisites

### Runtime Dependencies
- **PouchDB**: Local database operations
- **CouchDB**: Remote database storage
- **Node.js**: ≥20.11.0
- **TypeScript**: Type safety and compilation

### Development Dependencies
- **Mocha**: Test framework
- **Chai**: Assertion library
- **Sinon**: Mocking library
- **NYC (Istanbul)**: Coverage reporting
- **ESLint**: Code quality

### Internal Dependencies
- `contactTypeUtils`: Contact type configuration access
- `minifyLineage`: Lineage optimization
- `fetchHydratedDoc`: Document hydration
- `getMedicDocById`: Document retrieval
- `createMedicDoc`: Document creation
- `updateMedicDoc`: Document updating

---

## Migration and Rollout Considerations

### Backward Compatibility
✅ **No Breaking Changes**:
- Existing `get()` and `getAll()` methods unchanged
- New methods are additive only
- Existing code continues to work

### API Versioning
- Methods namespaced under `v1`: `Person.v1.create()`, `Person.v1.update()`
- Allows future versions without breaking changes
- REST endpoints: `/api/v1/person`, `/api/v1/place`, `/api/v1/report`

### Database Compatibility
- Documents created/updated follow existing CHT schema
- No database migrations needed
- Works with existing CouchDB instances

---

## Troubleshooting Guide

### Issue: "id.startsWith is not a function"
**Cause**: Passing hydrated object to function expecting string UUID.

**Solution**: Use `extractUuid()` to handle both formats:
```typescript
const uuid = extractUuid(field); // Works for string or object
```

---

### Issue: "Invalid parent type [undefined]"
**Cause**: Trying to read `type` from hydrated object (which only has `_id` and `parent`).

**Solution**: Always fetch full document for type validation:
```typescript
const parentDoc = await getMedicDocById(parentUuid);
const parentType = contactTypeUtils.getTypeId(parentDoc);
```

---

### Issue: "parent is required" but parent provided
**Cause**: Parent provided as empty string `""` or null.

**Solution**: Check for truthy value:
```typescript
if (requiresParent && !qualifier.parent) { /* error */ }
```

---

### Issue: ISO date stored as string instead of number
**Cause**: Not normalizing `reported_date` before storage.

**Solution**: Always use `normalizeReportedDate()`:
```typescript
reported_date: normalizeReportedDate(qualifier.reported_date)
```

---

### Issue: 400 instead of 404 for missing document
**Cause**: Using `InvalidArgumentError` instead of `NotFoundError`.

**Solution**: Throw correct error type:
```typescript
if (!existingDoc) {
  throw new NotFoundError(`Document [${id}] not found.`);
}
```

---

## Success Metrics

### Code Quality Metrics
- ✅ TypeScript compilation: 0 errors
- ✅ ESLint: 0 errors, 0 warnings
- ✅ Unit tests: 621 passing (100%)
- ✅ Integration tests: 264 passing (100%)
- ✅ Code coverage: 88.66% statements, 77.96% branches

### Functional Completeness
- ✅ Create operations for all entities (Person, Place, Report)
- ✅ Update operations for all entities
- ✅ Parent hierarchy validation
- ✅ Immutable field protection
- ✅ Field hydration with lineage
- ✅ Error handling with correct HTTP status codes
- ✅ Reference validation (reports)

### API Usability
- ✅ Programmatic JavaScript API
- ✅ REST API endpoints
- ✅ Consistent error messages
- ✅ Type safety (TypeScript)
- ✅ Documentation complete

---

## Quick Reference Commands

```bash
# Build
cd shared-libs/cht-datasource && npm run build

# Run unit tests
npm test

# Run integration tests
npm run integration-all-local

# Lint check
npx eslint src/

# Type check
npm run build

# Run specific test file
npm test test/local/person.spec.ts

# Generate coverage report
npm test
# Open coverage/index.html
```

---

## Related Documentation

- **Issue**: GitHub #9835
- **Implementation Details**: `DATASOURCE_API_CHANGES.md`
- **QA Reports**: `QA_TEST_REPORT.md`, `QA_VERIFICATION_REPORT.md`
- **Bug Fixes**: `FINAL_REPORTED_DATE_FIX_SUMMARY.md`
- **API Docs**: https://docs.communityhealthtoolkit.org/cht-datasource/

---

**Status**: ✅ COMPLETE AND VALIDATED
**Last Updated**: 2025-11-04
**Final Test Results**: 264/264 integration tests passing, 621/621 unit tests passing
