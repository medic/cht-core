# Add cht-datasource APIs for creation and update of contacts and reports

**Issue:** #9835
**Repository:** medic/cht-core
**Status:** OPEN
**Author:** @sugat009
**Assignee:** @apoorvapendse
**Labels:** C4GT Coding, C4GT Mentorship, Type: Improvement
**Milestone:** 5.1.0
**Complexity:** Medium
**Link:** https://github.com/medic/cht-core/issues/9835

---

## Original Description

CHT has an internal package called `cht-datasource` in `shared-libs/cht-datasource` used to query and fetch `contacts`(`person` or `place`) and `reports` from the database. There are APIs for fetching the list of `contacts` and `reports` UUIDs and fetching the detail of the `contacts` and `reports` using that UUID. We need to add APIs to create and update `contacts` and `reports`.

**Documentation:** https://docs.communityhealthtoolkit.org/cht-datasource/

---

## Goals

- [x] To have API that can create people.
- [x] To have API that can update people.
- [x] To have API that can create places.
- [x] To have API that can update places.
- [x] To have API that can create reports.
- [x] To have API that can update reports.

---

## For Agent Context

### Technical Scope

**Affected Components:**
- `shared-libs/cht-datasource/` - Core library implementation
- `shared-libs/cht-datasource/src/qualifier.ts` - Qualifier types and validators
- `shared-libs/cht-datasource/src/person.ts` - Person creation/update APIs
- `shared-libs/cht-datasource/src/place.ts` - Place creation/update APIs
- `shared-libs/cht-datasource/src/report.ts` - Report creation/update APIs
- REST API endpoints in `api/src/routing.js` or similar
- Integration tests for new endpoints

**Related Services:**
- Data Context (Local and Remote)
- CouchDB document creation/update
- UUID generation
- Date validation and formatting
- Contact type validation

**Tech Stack:**
- TypeScript (primary language)
- Node.js
- Mocha (testing framework)
- Docker (for testing environment)

### API Design Pattern

The implementation follows CHT's versioned API pattern:

```typescript
namespace v1 {
  const create = (context: DataContext) => (qualifier: Qualifier) => Promise<Entity>;
  const update = (context: DataContext) => (qualifier: Qualifier) => Promise<Entity>;
}
```

This pattern:
- Uses curried functions for dependency injection
- Separates context setup from operation execution
- Supports both local and remote data contexts
- Follows functional programming principles

### Validation Requirements

**For Contacts (Person/Place):**
- `type`: Required, non-empty string, must be valid contact type from settings
- `name`: Required, non-empty string
- `reported_date`: Optional, defaults to current time, must be in valid format
- `_id`: Optional for create (auto-generated), required format for update
- `_rev`: Not allowed for create, required for update

**For Reports:**
- `type`: Required, must be 'data_record'
- `form`: Required, non-empty string, must be valid form name
- `reported_date`: Required, must be in valid format
- `contact`: Required contact object
- `_id`: Optional for create (auto-generated), required format for update
- `_rev`: Not allowed for create, required for update

**Date Formats Accepted:**
- ISO 8601: 'YYYY-MM-DDTHH:mm:ssZ'
- ISO 8601 with milliseconds: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
- Unix epoch timestamp (number)

### REST API Endpoints to Create

**Person:**
- `POST /api/v1/person` - Create person
- `PUT /api/v1/person/:uuid` - Update person

**Place:**
- `POST /api/v1/place` - Create place
- `PUT /api/v1/place/:uuid` - Update place

**Report:**
- `POST /api/v1/report` - Create report
- `PUT /api/v1/report/:uuid` - Update report

### Expected Usage Patterns

**1. From Code (TypeScript/JavaScript):**

```typescript
const {getLocalDataContext, getRemoteDataContext, Person} = require('@medic/cht-datasource');
const dataContext = isOnlineOnly ? getRemoteDataContext(...)  : getLocalDataContext(...);
const createPerson = Person.v1.create(dataContext);
await createPerson({
  type: 'patient',
  name: 'John Doe',
  reported_date: '2025-01-15T10:30:00Z',
  // _id is optional, will be auto-generated
});
```

**2. From REST API:**

```bash
# Create
curl -X POST http://localhost:5988/api/v1/person \
  -H "Content-Type: application/json" \
  -d '{
    "type": "patient",
    "name": "Jane Doe",
    "reported_date": "2025-01-15T10:30:00Z"
  }'

# Update
curl -X PUT http://localhost:5988/api/v1/person/abc-123 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "patient",
    "name": "Jane Smith",
    "_rev": "2-xyz789"
  }'
```

### Similar Patterns in Codebase

**Existing Patterns to Reference:**
- `shared-libs/cht-datasource/src/person.ts` - Has `get()` and `getAll()` methods
- `shared-libs/cht-datasource/src/place.ts` - Has `get()` and `getAll()` methods
- `shared-libs/cht-datasource/src/report.ts` - Has `get()` and `getAll()` methods
- `shared-libs/cht-datasource/src/qualifier.ts` - Has existing qualifier patterns

**Key Patterns:**
1. Curried function design for context injection
2. Qualifier-based data validation
3. Type guards (e.g., `isContactQualifier()`)
4. Error handling with descriptive messages
5. Promise-based async operations

### Implementation Checklist

**Phase 1: Core Library (shared-libs/cht-datasource)**
- [ ] Update `qualifier.ts` with new qualifier types and validators
  - [ ] Add `ContactQualifier` type
  - [ ] Add `byContactQualifier()` function
  - [ ] Add `isContactQualifier()` type guard
  - [ ] Add `ReportQualifier` type
  - [ ] Add `byReportQualifier()` function
  - [ ] Add `isReportQualifier()` type guard
- [ ] Extend `person.ts` with create/update APIs
  - [ ] Add `v1.create()` function
  - [ ] Add `v1.update()` function
- [ ] Extend `place.ts` with create/update APIs
  - [ ] Add `v1.create()` function
  - [ ] Add `v1.update()` function
- [ ] Extend `report.ts` with create/update APIs
  - [ ] Add `v1.create()` function
  - [ ] Add `v1.update()` function

**Phase 2: REST API Endpoints**
- [ ] Add routing for new endpoints
  - [ ] `POST /api/v1/person`
  - [ ] `PUT /api/v1/person/:uuid`
  - [ ] `POST /api/v1/place`
  - [ ] `PUT /api/v1/place/:uuid`
  - [ ] `POST /api/v1/report`
  - [ ] `PUT /api/v1/report/:uuid`
- [ ] Add authentication/authorization middleware
- [ ] Add request validation middleware
- [ ] Add error handling

**Phase 3: Testing**
- [ ] Unit tests for qualifier functions
  - [ ] Test valid qualifiers
  - [ ] Test invalid qualifiers (missing fields, wrong formats)
  - [ ] Test type guards
- [ ] Unit tests for create/update functions
  - [ ] Test successful creation
  - [ ] Test successful update
  - [ ] Test error handling (invalid data, missing context)
  - [ ] Test auto-generation of _id
  - [ ] Test auto-generation of reported_date
- [ ] Integration tests for REST endpoints
  - [ ] Test POST endpoints (creation)
  - [ ] Test PUT endpoints (update)
  - [ ] Test authentication
  - [ ] Test validation errors
  - [ ] Test database interactions
- [ ] Ensure coverage > 85%

**Phase 4: Documentation**
- [ ] Update cht-datasource documentation
- [ ] Add API examples
- [ ] Update changelog
- [ ] Add migration guide if needed

### Constraints

- **Must maintain backward compatibility** - Existing get/getAll APIs must continue to work
- **Must follow CHT coding standards** - TypeScript types, functional patterns, error handling
- **Must include comprehensive tests** - Unit and integration tests required
- **Must support both local and remote contexts** - Works offline and online
- **Must validate all inputs** - No invalid data should reach database
- **Must follow existing patterns** - Curried functions, qualifiers, type guards

### Test Strategy

**Unit Tests (Mocha):**
- Mock DataContext
- Test qualifier validation logic
- Test error conditions
- Test edge cases (empty strings, invalid dates, etc.)

**Integration Tests:**
- Use test CouchDB instance
- Test actual document creation/update
- Test REST endpoint functionality
- Test with real DataContext

**Test Files Location:**
- `shared-libs/cht-datasource/test/` - Unit tests
- `tests/integration/cht-datasource/` - Integration tests (if applicable)

### Acceptance Criteria

**Functionality:**
- [ ] Can create Person via code API with valid data
- [ ] Can update Person via code API with valid data
- [ ] Can create Place via code API with valid data
- [ ] Can update Place via code API with valid data
- [ ] Can create Report via code API with valid data
- [ ] Can update Report via code API with valid data
- [ ] Can create Person via REST API with valid data
- [ ] Can update Person via REST API with valid data
- [ ] Can create Place via REST API with valid data
- [ ] Can update Place via REST API with valid data
- [ ] Can create Report via REST API with valid data
- [ ] Can update Report via REST API with valid data
- [ ] Auto-generates _id if not provided on creation
- [ ] Auto-generates reported_date if not provided
- [ ] Validates all required fields
- [ ] Rejects invalid date formats
- [ ] Rejects _rev on creation
- [ ] Requires _rev on update
- [ ] Returns created/updated entity

**Quality:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Code coverage > 85%
- [ ] No TypeScript compilation errors
- [ ] No ESLint errors
- [ ] Follows CHT coding conventions
- [ ] Proper error messages for all validation failures

**Documentation:**
- [ ] API documentation updated
- [ ] JSDoc comments added for all public functions
- [ ] Usage examples provided
- [ ] README updated if needed

### Risk Factors

- **Validation Complexity:** Need to validate against dynamic contact types from settings
- **Database Interactions:** Must handle CouchDB conflicts and errors gracefully
- **Context Handling:** Both local and remote contexts must work correctly
- **Backward Compatibility:** Must not break existing get/getAll functionality
- **Security:** REST endpoints need proper authentication/authorization

### Context Files to Reference

- Look for existing cht-datasource implementations in `shared-libs/cht-datasource/src/`
- Review existing REST API patterns in `api/src/` for endpoint structure
- Check existing qualifier patterns for validation approach
- Review test patterns in `shared-libs/cht-datasource/test/`

### Additional Notes

- This issue is part of the C4GT (Code for GovTech) program
- Implementation is already marked complete (all goals checked)
- This POC will recreate the implementation to validate agent capabilities
- Focus on following existing CHT patterns rather than inventing new approaches

---

## Expected Outcome Details

### 1. Person API

**Code Usage:**
```typescript
const {getLocalDataContext, getRemoteDataContext, Person} = require('@medic/cht-datasource');
const dataContext = isOnlineOnly ? getRemoteDataContext(...)  : getLocalDataContext(...);
const createPerson = Person.v1.create(dataContext);  // .update() for update functionality
await createPerson({
  type: <valid_person_type>,
  name: <string_name_value>,
  reported_date: <valid_date_value>, // optional value, should be set to current time if not provided
  _id: <uuid>, // optional value for create, should be generated if not provided
  _rev: <uuid-ish> // required for update, not allowed for create
  ...
});
```

**REST API:**
- Create: `POST /api/v1/person`
- Update: `PUT /api/v1/person/:uuid`

**Request Body:**
```json
{
  "type": "<valid_person_type>",
  "name": "<string_name_value>",
  "reported_date": "<valid_date_value>",
  "_id": "<uuid>",
  "_rev": "<uuid-ish>"
}
```

### 2. Place API

**Code Usage:**
```typescript
const {getLocalDataContext, getRemoteDataContext, Place} = require('@medic/cht-datasource');
const dataContext = isOnlineOnly ? getRemoteDataContext(...)  : getLocalDataContext(...);
const createPlace = Place.v1.create(dataContext);  // .update() for update functionality
await createPlace({
  type: <valid_place_type>,
  name: <string_name_value>,
  reported_date: <valid_date_value>,
  _id: <uuid>,
  _rev: <uuid-ish>
  ...
});
```

**REST API:**
- Create: `POST /api/v1/place`
- Update: `PUT /api/v1/place/:uuid`

**Request Body:**
```json
{
  "type": "<valid_place_type>",
  "name": "<string_name_value>",
  "reported_date": "<valid_date_value>",
  "_id": "<uuid>",
  "_rev": "<uuid-ish>"
}
```

### 3. Report API

**Code Usage:**
```typescript
const {getLocalDataContext, getRemoteDataContext, Report} = require('@medic/cht-datasource');
const dataContext = isOnlineOnly ? getRemoteDataContext(...)  : getLocalDataContext(...);
const createReport = Report.v1.create(dataContext); // update() for update functionality
await createReport({
  type: 'data_record',
  reported_date: <valid_date_value>,
  form: <form_name>,
  contact: {
    _id: <uuid>,
    ...
  }
  ...
});
```

**REST API:**
- Create: `POST /api/v1/report`
- Update: `PUT /api/v1/report/:uuid`

**Request Body:**
```json
{
  "type": "data_record",
  "reported_date": "<valid_date_value>",
  "form": "<valid_form_name>",
  "contact": <contact_object>
}
```

---

## Implementation Details (From Original Issue)

### Detailed TypeScript Signatures

**qualifier.ts:**
```typescript
/**
 * A qualifier for a contact
 * */
type ContactQualifier = ReadOnly<{
    type: string,
    name: string,
    reported_date?: string | number,
    _id?: string,
    _rev?: string
}>;

/**
 * Builds a qualifier for creation and update of a contact with
 * the given fields.
 * @param data object containing the fields for a contact
 * @returns the contact qualifier
 * @throws Error if type is not provided or is empty
 * @throws Error if name is not provided or is empty
 * @throws Error if reported_date is not in a valid format. Valid formats are 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
 * */
const byContactQualifier = (data: object) => ContactQualifier;

/**
 * Returns `true` if the given qualifier is a {@link ContactQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given type is a {@link ContactQualifier}, otherwise `false`.
 */
const isContactQualifier = (qualifier: unknown) => qualifier is ContactQualifier;

/**
 * A qualifier for a report
 * */
type ReportQualifier = ReadOnly<{
    type: string,
    form: string,
    reported_date?: string | number,
    _id?: string,
    _rev?: string
}>;

/**
 * Builds a qualifier for creation and update of a report with
 * the given fields.
 * @param data object containing the fields for a report
 * @returns the report qualifier
 * @throws Error if type is not provided or is empty
 * @throws Error if form is not provided or is empty
 * @throws Error if reported_date is not in a valid format. Valid formats are 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
 * */
const byReportQualifier = (data: object) => ReportQualifier;

/**
 * Returns `true` if the given qualifier is a {@link ReportQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given type is a {@link ReportQualifier}, otherwise `false`.
 */
const isReportQualifier = (qualifier: unknown) => qualifier is ReportQualifier;
```

**person.ts:**
```typescript
namespace v1 {
  // NEW REST API: POST /api/v1/person
  /**
   * Returns a function for creating a person from the given data context.
   * @param context the current data context
   * @returns a function for creating a person
   * @throws Error if a data context is not provided
   */
  /**
   * Returns the created person for the given qualifier.
   * @param qualifier data for the person to be created
   * @returns the created person
   * @throws Error if the qualifier is invalid
   */
  const create =
    (context: DataContext) => (qualifier: ContactQualifier) =>
      Promise<Person>;

  // NEW REST API: PUT /api/v1/person/:uuid
  /**
   * Returns a function for updating a person from the given data context
   * @param context the current data context
   * @returns a function for updating a person
   * @throws Error if a data context is not provided
   */
  /**
   * Returns the updated person for the given qualifier.
   * @param qualifier data for the person to be updated
   * @returns the updated person
   * @throws Error if the qualifier is invalid
   */
  const update =
    (context: DataContext) => (qualifier: ContactQualifier) =>
      Promise<Person>;
}
```

**place.ts:**
```typescript
namespace v1 {
  // NEW REST API: PUT /api/v1/place
  /**
   * Returns a function for creating a place from the given data context.
   * @param context the current data context
   * @returns a function for creating a place
   * @throws Error if a data context is not provided
   */
  /**
   * Returns the created place for the given qualifier.
   * @param qualifier data for the place to be created
   * @returns the created place
   * @throws Error if the qualifier is invalid
   */
  const create =
    (context: DataContext) => (qualifier: ContactQualifier) =>
      Promise<Place>;

  // NEW REST API: PUT /api/v1/place/:uuid
  /**
   * Returns a function for updating a place from the given data context
   * @param context the current data context
   * @returns a function for updating a place
   * @throws Error if a data context is not provided
   */
  /**
   * Returns the updated place for the given qualifier.
   * @param qualifier data for the place to be updated
   * @returns the updated place
   * @throws Error if the qualifier is invalid
   */
  const update =
    (context: DataContext) => (qualifier: ContactQualifier) =>
      Promise<Place>;
}
```

**report.ts:**
```typescript
namespace v1 {
  // NEW REST API: POST /api/v1/report
  /**
   * Returns a function for creating a report from the given data context.
   * @param context the current data context
   * @returns a function for creating a report
   * @throws Error if a data context is not provided
   */
  /**
   * Returns the created report for the given qualifier.
   * @param qualifier data for the report to be created
   * @returns the created report
   * @throws Error if the qualifier is invalid
   */
  const create = (context: DataContext) => (qualifier: ReportQualifier) =>
    Promise<Report>;

  // NEW REST API: PUT /api/v1/report/:uuid
  /**
   * Returns a function for updating a report from the given data context
   * @param context the current data context
   * @returns a function for updating a report
   * @throws Error if a data context is not provided
   */
  /**
   * Returns the updated report for the given qualifier.
   * @param qualifier data for the report to be updated
   * @returns the updated report
   * @throws Error if the qualifier is invalid
   */
  const update = (context: DataContext) => (qualifier: ReportQualifier) =>
    Promise<Report>;
}
```

---

## Tech Skills Required

- Docker
- JavaScript
- Mocha (testing framework)
- Node.js
- TypeScript

## Product & Organization

- **Product:** Community Health Toolkit (cht-core)
- **Organization:** Medic
- **Domain:** Healthcare
- **Category:** API Development
