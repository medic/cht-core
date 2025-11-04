# Developer Context: CHT Datasource Create/Update Implementation

**Feature**: Create and Update APIs for Person, Place, and Report entities
**Pattern**: Curried functions with qualifier-based validation
**Architecture**: Local + Remote dual implementation with shared validation logic

---

## Architecture Overview

### Layered Architecture

```
Public API (person.ts, place.ts, report.ts)
    ↓
Version Namespace (v1)
    ↓
Implementation Layer
    ├─ Local (shared-libs/cht-datasource/src/local/)
    │   ├─ Direct PouchDB access
    │   ├─ Full validation logic
    │   └─ Document hydration
    └─ Remote (shared-libs/cht-datasource/src/remote/)
        ├─ API calls
        ├─ Minimal validation
        └─ Delegates to API server
```

### Data Flow

**Create Operation**:

```
User → create(context) → (qualifier) → Validate → Hydrate → Create Doc → Return Entity
```

**Update Operation**:

```
User → update(context) → (qualifier) → Validate → Check Immutable → Fetch Existing → Hydrate → Update Doc → Return Entity
```

---

## Core Design Patterns

### Pattern 1: Curried Function Architecture

**Purpose**: Separate context setup from operation execution

**Implementation**:

```typescript
// Public API signature
export namespace v1 {
    const create = (context: DataContext) => (qualifier: ContactQualifier) => Promise<Person>;
}

// Usage
const dataContext = getLocalDataContext(...);
const createPerson = Person.v1.create(dataContext);  // Setup
const person = await createPerson(qualifier);        // Execute
```

**Benefits**:

- Context is set up once, used many times
- Supports both local and remote contexts
- Enables dependency injection for testing
- Clean functional composition

**Example from person.ts**:

```typescript
export namespace v1 {
    export const create = (context: DataContext) => {
        if (isLocalDataContext(context)) {
            return Local.Person.v1.create(context);
        }
        if (isRemoteDataContext(context)) {
            return Remote.Person.v1.create(context);
        }
        throw new Error(`Unknown context type: ${typeof context}`);
    };
}
```

---

### Pattern 2: Qualifier-Based Validation

**Purpose**: Type-safe input validation before processing

**Type Definitions** (qualifier.ts):

```typescript
export type ContactQualifier = Readonly<{
    type: string;
    name: string;
    reported_date?: string | number;
    parent?: string | Record<string, unknown>;
    contact?: string | Record<string, unknown>;
    _id?: string;
    _rev?: string;
    [key: string]: unknown;  // Allow additional fields
}>;

export type ReportQualifier = Readonly<{
    type: string;
    form: string;
    reported_date?: string | number;
    contact?: string | Record<string, unknown>;
    _id?: string;
    _rev?: string;
    [key: string]: unknown;
}>;
```

**Builder Functions**:

```typescript
export const byContactQualifier = (data: unknown): ContactQualifier => {
    // Validation logic
    if (!isRecord(data)) {
        throw new InvalidArgumentError('Qualifier must be an object');
    }
    if (!hasField(data, 'type') || !isString(data.type) || data.type.trim().length === 0) {
        throw new InvalidArgumentError('type is required and must be a non-empty string');
    }
    // ... more validation
    return data as ContactQualifier;
};
```

**Type Guards**:

```typescript
export const isContactQualifier = (qualifier: unknown): qualifier is ContactQualifier => {
    if (!isRecord(qualifier)) return false;
    if (!hasField(qualifier, 'type') || !isString(qualifier.type)) return false;
    if (!hasField(qualifier, 'name') || !isString(qualifier.name)) return false;
    return true;
};
```

**Benefits**:

- Runtime type validation
- Type safety in TypeScript
- Reusable validation logic
- Clear error messages

---

### Pattern 3: Helper Function Composition

**Purpose**: Modular, testable, reusable utilities

**Example 1: UUID Extraction**

```typescript
const extractUuid = (
    field: string | Record<string, unknown> | undefined
): string | undefined => {
    if (!field) {
        return undefined;
    }
    if (typeof field === 'string') {
        return field;
    }
    if (typeof field === 'object') {
        return (field as Record<string, unknown>)._id as string;
    }
    return undefined;
};
```

**Example 2: Field Hydration**

```typescript
const hydrateField = async (
    medicDb: PouchDB.Database<Doc>,
    field: string | Record<string, unknown> | undefined,
    fieldName: string
): Promise<Record<string, unknown> | undefined> => {
    if (!field) {
        return undefined;
    }

    // Already hydrated
    if (typeof field === 'object') {
        return field;
    }

    // UUID string - need to hydrate
    if (typeof field === 'string') {
        const hydratedDoc = await fetchHydratedDoc(medicDb)(field);
        return minifyLineage(hydratedDoc);
    }

    throw new InvalidArgumentError(`${fieldName} must be a string UUID or object`);
};
```

**Example 3: Date Normalization**

```typescript
const normalizeReportedDate = (reportedDate?: string | number): number => {
    if (reportedDate === undefined) {
        return Date.now();
    }
    if (typeof reportedDate === 'number') {
        return reportedDate;
    }
    const timestamp = new Date(reportedDate).getTime();
    if (isNaN(timestamp)) {
        throw new InvalidArgumentError(
            `Invalid reported_date [${reportedDate}]. Must be a valid date string or timestamp.`
        );
    }
    return timestamp;
};
```

**Benefits**:

- DRY (Don't Repeat Yourself)
- Easy to test in isolation
- Clear single responsibility
- Composable for complex operations

---

## File Structure and Organization

### Core Implementation Files

```
shared-libs/cht-datasource/src/
├── local/
│   ├── person.ts          # Local person create/update
│   ├── place.ts           # Local place create/update
│   ├── report.ts          # Local report create/update
│   └── libs/
│       └── doc.ts         # Document CRUD helpers
├── remote/
│   ├── person.ts          # Remote person create/update
│   ├── place.ts           # Remote place create/update
│   └── report.ts          # Remote report create/update
├── person.ts              # Public Person API
├── place.ts               # Public Place API
├── report.ts              # Public Report API
├── qualifier.ts           # Qualifier types and validators
├── libs/
│   ├── error.ts          # Error classes (InvalidArgumentError, NotFoundError, ConflictError)
│   └── parameter-validators.ts  # Parameter validation utilities
└── index.ts              # Public exports
```

### API Integration Files

```
api/src/
├── controllers/
│   ├── person.js         # Person endpoint handlers
│   ├── place.js          # Place endpoint handlers
│   └── report.js         # Report endpoint handlers
├── routing.js            # Route definitions
└── server-utils.js       # Error handling middleware
```

### Test Files

```
shared-libs/cht-datasource/test/
└── local/
    ├── person.spec.ts    # Person unit tests
    ├── place.spec.ts     # Place unit tests
    └── report.spec.ts    # Report unit tests

tests/integration/
├── api/controllers/
│   ├── person.spec.js    # Person API tests
│   ├── place.spec.js     # Place API tests
│   └── report.spec.js    # Report API tests
└── shared-libs/cht-datasource/
    ├── person.spec.js    # Person library tests
    ├── place.spec.js     # Place library tests
    └── report.spec.js    # Report library tests
```

---

## Implementation Details by Entity

### Person Implementation

**File**: `shared-libs/cht-datasource/src/local/person.ts`

**Create Method** (lines 180-228):

```typescript
const _create = async (
    medicDb: PouchDB.Database<Doc>,
    settingsService: SettingsService,
    qualifier: ContactQualifier
): Promise<Person> => {
    logger.debug(`Creating person [${qualifier.type}]...`);

    // 1. Validate person type
    const personTypes = await contactTypeUtils.getPersonTypes(settingsService);
    if (!personTypes.some(t => t.id === qualifier.type)) {
        throw new InvalidArgumentError(`Invalid person type [${qualifier.type}].`);
    }

    // 2. Reject _rev for create
    if (qualifier._rev) {
        throw new InvalidArgumentError('_rev is not allowed when creating a person.');
    }

    // 3. Validate parent (if required or provided)
    await validateParent(medicDb, settingsService, personTypes, qualifier);

    // 4. Hydrate parent and contact fields
    const hydratedParent = await hydrateField(medicDb, qualifier.parent, 'parent');
    const hydratedContact = await hydrateField(medicDb, qualifier.contact, 'contact');

    // 5. Build document
    const docToCreate = {
        ...qualifier,
        parent: hydratedParent,
        contact: hydratedContact,
        reported_date: normalizeReportedDate(qualifier.reported_date),
        type: 'contact',
        contact_type: qualifier.type,
    };

    // 6. Create in database
    const createdDoc = await createMedicDoc(medicDb)(docToCreate);

    // 7. Validate and return
    const person = isPerson(createdDoc) ? createdDoc : null;
    if (!person) {
        throw new Error(`Created document [${createdDoc._id as string}] is not a valid person.`);
    }

    logger.debug(`Created person [${person._id}]`);
    return person;
};
```

**Update Method** (lines 296-366):

```typescript
const _update = async (
    medicDb: PouchDB.Database<Doc>,
    settingsService: SettingsService,
    qualifier: ContactQualifier
): Promise<Person> => {
    logger.debug(`Updating person [${qualifier._id ?? 'unknown'}]...`);

    // 1. Validate required fields
    if (!qualifier._id) {
        throw new InvalidArgumentError('_id is required for update operations.');
    }
    if (!qualifier._rev) {
        throw new InvalidArgumentError('_rev is required for update operations.');
    }

    // 2. Fetch existing document
    const getMedicDocByIdInner = getMedicDocById(medicDb);
    const existingDoc = await getMedicDocByIdInner(qualifier._id);
    if (!existingDoc) {
        throw new NotFoundError(`Document [${qualifier._id}] not found.`);
    }

    // 3. Validate person type
    const personTypes = await contactTypeUtils.getPersonTypes(settingsService);
    const typeId = qualifier.type || contactTypeUtils.getTypeId(existingDoc);
    if (!personTypes.some(t => t.id === typeId)) {
        throw new InvalidArgumentError(`Invalid person type [${typeId}].`);
    }

    // 4. Validate immutable fields
    const immutableFields = [
        {name: 'type', current: contactTypeUtils.getTypeId(existingDoc), incoming: qualifier.type},
        {name: 'reported_date', current: existingDoc.reported_date, incoming: qualifier.reported_date},
        {
            name: 'parent',
            current: extractUuid(existingDoc.parent as string | Record<string, unknown> | undefined),
            incoming: extractUuid(qualifier.parent)
        },
    ];

    for (const field of immutableFields) {
        if (field.incoming !== undefined && field.current !== field.incoming) {
            throw new InvalidArgumentError(
                `Field [${field.name}] is immutable and cannot be changed. ` +
                `Current value: [${field.current as string}], Attempted value: [${field.incoming as string}].`
            );
        }
    }

    // 5. Validate parent (if provided in qualifier)
    if (qualifier.parent) {
        await validateParent(medicDb, settingsService, personTypes, qualifier);
    }

    // 6. Build update document (merge with existing)
    const docToUpdate = {
        ...existingDoc,
        ...qualifier,
        type: 'contact',
        contact_type: typeId,
    };

    // 7. Update in database
    const updatedDoc = await updateMedicDoc(medicDb)(docToUpdate);

    // 8. Validate and return
    const person = isPerson(updatedDoc) ? updatedDoc : null;
    if (!person) {
        throw new Error(`Updated document [${updatedDoc._id as string}] is not a valid person.`);
    }

    logger.debug(`Updated person [${person._id}]`);
    return person;
};
```

**Parent Validation Helper** (lines 230-294):

```typescript
const validateParent = async (
    medicDb: PouchDB.Database<Doc>,
    settingsService: SettingsService,
    personTypes: ContactType[],
    qualifier: ContactQualifier
): Promise<void> => {
    const personType = personTypes.find(p => p.id === qualifier.type);
    const requiresParent = Array.isArray(personType?.parents) && personType.parents.length > 0;

    // Check if parent is required
    if (requiresParent && !qualifier.parent) {
        throw new InvalidArgumentError(`parent is required for person type [${qualifier.type}].`);
    }

    // Check if parent is not allowed
    if (!requiresParent && qualifier.parent) {
        throw new InvalidArgumentError(
            `parent is not allowed for person type [${qualifier.type}]. This is a top-level person type.`
        );
    }

    // If parent provided, validate it
    if (qualifier.parent) {
        // Extract UUID (works for string or hydrated object)
        let parentUuid: string;
        if (typeof qualifier.parent === 'string') {
            parentUuid = qualifier.parent;
        } else if (typeof qualifier.parent === 'object') {
            parentUuid = (qualifier.parent as Record<string, unknown>)._id as string;
        } else {
            throw new InvalidArgumentError('parent must be a string UUID or an object with _id');
        }

        // Fetch parent document to validate type
        const getMedicDocByIdInner = getMedicDocById(medicDb);
        const parentDoc = await getMedicDocByIdInner(parentUuid);
        if (!parentDoc) {
            throw new InvalidArgumentError(`parent document [${parentUuid}] not found.`);
        }

        // Validate parent type
        const parentTypeId = contactTypeUtils.getTypeId(parentDoc);
        const allowedParentTypes = (personType?.parents as string[]) || [];
        if (!allowedParentTypes.includes(parentTypeId)) {
            throw new InvalidArgumentError(
                `Invalid parent type [${parentTypeId}] for person type [${qualifier.type}]. ` +
                `Allowed parent types: [${allowedParentTypes.join(', ')}].`
            );
        }
    }
};
```

---

### Place Implementation

**File**: `shared-libs/cht-datasource/src/local/place.ts`

**Key Differences from Person**:

1. Contact field is immutable during updates (Person allows changes)
2. Uses `contactTypeUtils.getPlaceTypes()` instead of `getPersonTypes()`
3. Otherwise follows identical pattern

**Immutable Fields** (place.ts line 327-338):

```typescript
const immutableFields = [
    {name: 'type', current: contactTypeUtils.getTypeId(existingDoc), incoming: qualifier.type},
    {name: 'reported_date', current: existingDoc.reported_date, incoming: qualifier.reported_date},
    {
        name: 'parent',
        current: extractUuid(existingDoc.parent as string | Record<string, unknown> | undefined),
        incoming: extractUuid(qualifier.parent)
    },
    {
        name: 'contact',
        current: extractUuid(existingDoc.contact as string | Record<string, unknown> | undefined),
        incoming: extractUuid(qualifier.contact)
    },
];
```

---

### Report Implementation

**File**: `shared-libs/cht-datasource/src/local/report.ts`

**Key Differences from Person/Place**:

1. Uses `ReportQualifier` instead of `ContactQualifier`
2. Validates `form` field exists in database
3. No parent field (uses `contact` instead)
4. Type must always be `'data_record'`
5. Validates referenced documents (contact, patient, place) exist

**Form Validation** (report.ts lines 100-108):

```typescript
const isValidForm = async (medicDb: PouchDB.Database<Doc>, formName: string): Promise<boolean> => {
    const queryDocUuidsByKeyInner = queryDocUuidsByKey(medicDb);
    const formDocs = await queryDocUuidsByKeyInner('medic-client/forms', formName);
    return formDocs.length > 0;
};

// Usage in create
if (!(await isValidForm(medicDb, qualifier.form))) {
    throw new InvalidArgumentError(
        `Invalid form [${qualifier.form}]. Form does not exist in database.`
    );
}
```

**Report Type Validation** (report.ts lines 206-209):

```typescript
// Validate report type
if (qualifier.type !== 'data_record') {
    throw new InvalidArgumentError(
        `Invalid report type [${qualifier.type}]. Reports must have type 'data_record'.`
    );
}
```

**Reference Validation** (report.ts lines 87-98):

```typescript
const validateDocumentExists = async (
    medicDb: PouchDB.Database<Doc>,
    uuid: string,
    fieldName: string
): Promise<void> => {
    const getDocByIdInner = getDocById(medicDb);
    const doc = await getDocByIdInner(uuid);

    if (!doc) {
        throw new InvalidArgumentError(`${fieldName} document [${uuid}] not found.`);
    }
};

// Usage in create (lines 263-293)
// Only validate minimal objects, not fully hydrated ones
if (typeof qualifier.contact === 'object') {
    const contactId = (qualifier.contact as Record<string, unknown>)._id as string;
    if (!contactId) {
        throw new InvalidArgumentError('contact object must have _id field.');
    }

    // Only validate if it's a minimal object (just has _id)
    const keys = Object.keys(qualifier.contact);
    if (keys.length === 1 && keys[0] === '_id') {
        await validateDocumentExists(medicDb, contactId, 'contact');
    }
}
```

---

## Remote Implementation Pattern

**Purpose**: Delegate to REST API endpoints

**Example** (remote/person.ts):

```typescript
const _create = (remoteDataContext: RemoteDataContext) => async (
    qualifier: ContactQualifier
): Promise<Person> => {
    const url = `${remoteDataContext.url}/api/v1/person`;
    const response = await remoteDataContext.fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(qualifier),
    });

    if (!response.ok) {
        throw new Error(`Failed to create person: ${response.statusText}`);
    }

    return await response.json() as Person;
};
```

**Key Points**:

- Minimal validation (trust API layer)
- Simple HTTP request/response
- Error handling delegates to server
- No document hydration (server handles it)

---

## Error Handling Strategy

### Error Class Hierarchy

**File**: `shared-libs/cht-datasource/src/libs/error.ts`

```typescript
/**
 * Represents an error due to invalid arguments or parameters.
 * Maps to HTTP 400 Bad Request.
 */
export class InvalidArgumentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidArgumentError';
    }
}

/**
 * Represents an error when a requested resource is not found.
 * Maps to HTTP 404 Not Found.
 */
export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

/**
 * Represents an error due to a document update conflict.
 * Maps to HTTP 409 Conflict.
 */
export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}
```

### API Error Handling Middleware

**File**: `api/src/server-utils.js`

```javascript
const {InvalidArgumentError, NotFoundError, ConflictError} = require('@medic/cht-datasource');

const handleError = (err, req, res, next) => {
  let code = err.code || err.statusCode || err.status || 500;

  // Map error types to HTTP status codes
  if (err instanceof InvalidArgumentError) {
    code = 400;
  }
  if (err instanceof NotFoundError) {
    code = 404;
  }
  if (err instanceof ConflictError) {
    code = 409;
  }

  res.status(code).json({
    code,
    error: err.message || 'Internal Server Error'
  });
};
```

### Conflict Detection Enhancement

**File**: `shared-libs/cht-datasource/src/local/libs/doc.ts`

```typescript
try {
    const result = await medicDb.put(doc);
    return {...doc, _rev: result.rev};
} catch (err) {
    logger.error(`Failed to update document [${doc._id}]:`, err);

    // Enhanced conflict detection
    const error = err as {
        status?: number;
        name?: string;
        message?: string;
        error?: string;
        reason?: string
    };

    // Check for various conflict indicators from PouchDB/CouchDB
    const isConflict = error.status === 409 ||
        error.name === 'conflict' ||
        error.error === 'conflict' ||
        error.error === 'bad_request' ||  // PouchDB uses this for bad rev
        (error.reason && /conflict|revision|invalid.*rev/i.test(error.reason)) ||
        (error.message && /conflict|revision|invalid.*rev/i.test(error.message));

    if (isConflict) {
        throw new ConflictError(error.message || error.reason || 'Document update conflict');
    }

    throw err;
}
```

**Why This Matters**:

- "Invalid rev format" is actually a conflict scenario
- PouchDB returns `bad_request` for malformed _rev
- Regex patterns catch various message formats
- Properly returns 409 instead of 400

---

## TypeScript Best Practices Applied

### 1. Strict Type Assertions

**Problem**: Implicit type conversions causing errors

**Solution**: Explicit type guards and assertions

```typescript
// Bad
const parentUuid = qualifier.parent._id;  // Error if parent is string

// Good
let parentUuid: string;
if (typeof qualifier.parent === 'string') {
    parentUuid = qualifier.parent;
} else if (typeof qualifier.parent === 'object') {
    parentUuid = (qualifier.parent as Record<string, unknown>)._id as string;
} else {
    throw new InvalidArgumentError('Invalid parent type');
}
```

### 2. Non-Nullable Assertions

**When to Use**: When you KNOW a value is not null/undefined

```typescript
// Bad - TypeScript complains
const uuid = qualifier._id;  // Type: string | undefined

// Good - Assert it's defined
const uuid = qualifier._id!;  // Type: string

// Better - Check first
if (!qualifier._id) {
    throw new Error('_id required');
}
const uuid = qualifier._id;  // Type: string (narrowed)
```

### 3. Array Type Assertions

**Problem**: TypeScript can't infer array item types from optional chaining

**Solution**: Explicit array checks

```typescript
// Bad
const requiresParent = personType?.parents && personType.parents.length > 0;
// Error: Property 'length' does not exist on type '{}'

// Good
const requiresParent = Array.isArray(personType?.parents) && personType.parents.length > 0;
```

### 4. Index Signature Compatibility

**Problem**: Adding fields with incompatible types

```typescript
// Bad - Type error
const doc = {
    ...existingDoc,
    contact: hydratedObject,  // Record<string, unknown> not assignable to DataValue
};

// Good - Type assertion
const doc = {
    ...existingDoc,
    contact: hydratedObject,
} as Omit<Doc, '_rev'>;
```

---

## Code Style Guidelines

### Naming Conventions

- **snake_case**: Database properties (`contact_id`, `reported_date`, `contact_type`)
- **lowerCamelCase**: TypeScript variables, functions (`createPerson`, `isValid`)
- **UpperCamelCase**: Types, Classes, Interfaces (`Person`, `ContactQualifier`)
- **UPPER_SNAKE_CASE**: Constants (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)

### Function Naming

- **Predicates**: Start with `is`, `has`, `can` → `isPerson`, `hasParent`, `canUpdate`
- **Actions**: Verb first → `createDoc`, `updateDoc`, `validateParent`
- **Getters**: Start with `get` → `getMedicDocById`, `getPersonTypes`
- **Helpers**: Descriptive verb phrases → `extractUuid`, `normalizeReportedDate`

### Function Length

- Target: < 50 lines per function
- Complex operations: Extract to helper functions
- Single Responsibility Principle

### Error Messages

**Format**: `"Field [${fieldName}] ${description}. ${additional_context}."`

**Examples**:

- `"parent is required for person type [patient]."`
- `"Field [type] is immutable and cannot be changed. Current value: [patient], Attempted value: [clinic]."`
- `"Invalid parent type [clinic] for person type [patient]. Allowed parent types: [district_hospital, health_center]."`

**Best Practices**:

- Include field name in brackets
- Include current and attempted values when relevant
- Suggest valid options when applicable
- Be specific and actionable

---

## Testing Patterns

### Unit Test Structure

**File**: `test/local/person.spec.ts`

```typescript
describe('Person.v1.create()', () => {
    let medicDb: SinonStubbedInstance<PouchDB.Database<Doc>>;
    let settingsService: SinonStubbedInstance<SettingsService>;
    let localContext: LocalDataContext;

    beforeEach(() => {
        // Setup mocks
        medicDb = createMedicDbStub();
        settingsService = createSettingsServiceStub();
        localContext = {medicDb, settingsService};

        // Configure default stubs
        settingsService.get.resolves({
            contact_types: [
                {id: 'patient', parents: ['clinic']},
                {id: 'clinic', parents: []}
            ]
        });
    });

    describe('Success Cases', () => {
        it('creates person with minimal data', async () => {
            const qualifier = {type: 'patient', name: 'John Doe', parent: 'clinic-uuid'};

            // Mock database responses
            medicDb.get.resolves({_id: 'clinic-uuid', type: 'contact', contact_type: 'clinic'});
            medicDb.put.resolves({ok: true, id: 'person-uuid', rev: '1-abc'});

            const person = await Person.v1.create(localContext)(qualifier);

            expect(person._id).to.equal('person-uuid');
            expect(person.name).to.equal('John Doe');
            expect(medicDb.put.calledOnce).to.be.true;
        });
    });

    describe('Error Cases', () => {
        it('throws error when parent is required but missing', async () => {
            const qualifier = {type: 'patient', name: 'John Doe'};

            await expect(Person.v1.create(localContext)(qualifier))
                .to.be.rejectedWith(InvalidArgumentError, 'parent is required');
        });
    });
});
```

### Integration Test Structure

**File**: `tests/integration/api/controllers/person.spec.js`

```javascript
describe('POST /api/v1/person', () => {
  let place0,
    place1;

  before(async () => {
    // Setup test fixtures
    place0 = await utils.saveDoc({type: 'contact', contact_type: 'district_hospital'});
    place1 = await utils.saveDoc({
      type: 'contact',
      contact_type: 'health_center',
      parent: {_id: place0._id}
    });
  });

  it('creates person with minimal data', async () => {
    const personData = {
      type: 'patient',
      name: 'John Doe',
      parent: {_id: place1._id}
    };

    const response = await utils.request({
      path: '/api/v1/person',
      method: 'POST',
      body: personData
    });

    expect(response._id).to.exist;
    expect(response.name).to.equal('John Doe');
  });

  it('returns 400 when parent is required but missing', async () => {
    const personData = {
      type: 'patient',
      name: 'John Doe'
      // parent missing
    };

    await expect(utils.request({
      path: '/api/v1/person',
      method: 'POST',
      body: personData
    })).to.be.rejectedWith('400 - {"code":400,"error":"parent is required"}');
  });
});
```

### Mock Patterns

**Pattern 1: Database Stub**

```typescript
const createMedicDbStub = () => {
    return {
        get: sinon.stub(),
        put: sinon.stub(),
        query: sinon.stub(),
        allDocs: sinon.stub(),
    } as unknown as SinonStubbedInstance<PouchDB.Database<Doc>>;
};
```

**Pattern 2: Chained Stubs**

```typescript
medicDb.get
    .withArgs('person-uuid').resolves(personDoc)
    .withArgs('parent-uuid').resolves(parentDoc);
```

**Pattern 3: Query Result Stub**

```typescript
medicDb.query.resolves({
    rows: [
        {id: 'form:pregnancy_home_visit', key: 'pregnancy_home_visit'}
    ]
});
```

---

## Performance Optimization Strategies

### 1. Minimize Database Queries

**Problem**: Multiple queries for same document

```typescript
// Bad - queries parent document twice
const parentDoc1 = await getMedicDocById(parentUuid);  // For existence check
const parentDoc2 = await getMedicDocById(parentUuid);  // For type validation

// Good - query once, reuse
const parentDoc = await getMedicDocById(parentUuid);
if (!parentDoc) throw new Error('Parent not found');
const parentType = contactTypeUtils.getTypeId(parentDoc);
```

### 2. Skip Unnecessary Hydration

**Problem**: Re-hydrating already hydrated objects

```typescript
// Bad - always hydrate
const hydratedParent = await hydrateField(medicDb, qualifier.parent, 'parent');

// Good - check if already hydrated
if (typeof qualifier.parent === 'object') {
    // Already hydrated, use as-is
    hydratedParent = qualifier.parent;
} else {
    // UUID string, need to hydrate
    hydratedParent = await hydrateField(medicDb, qualifier.parent, 'parent');
}
```

### 3. Batch Validation Queries

**Opportunity**: Validate multiple references in parallel

```typescript
// Sequential (slow)
await validateDocumentExists(medicDb, contactUuid, 'contact');
await validateDocumentExists(medicDb, patientUuid, 'patient');
await validateDocumentExists(medicDb, placeUuid, 'place');

// Parallel (fast)
await Promise.all([
    validateDocumentExists(medicDb, contactUuid, 'contact'),
    validateDocumentExists(medicDb, patientUuid, 'patient'),
    validateDocumentExists(medicDb, placeUuid, 'place'),
]);
```

### 4. Cache Contact Type Configuration

**Problem**: Fetching settings on every create/update

```typescript
// Bad - queries settings every time
const personTypes = await contactTypeUtils.getPersonTypes(settingsService);

// Good - cache at module level
let cachedPersonTypes: ContactType[] | null = null;
const getPersonTypes = async (settingsService: SettingsService) => {
    if (!cachedPersonTypes) {
        cachedPersonTypes = await contactTypeUtils.getPersonTypes(settingsService);
    }
    return cachedPersonTypes;
};
```

---

## Debugging Tips

### Enable Debug Logging

```typescript
import logger from '@medic/logger';

// In code
logger.debug(`Creating person [${qualifier.type}]...`);
logger.debug(`Validated parent [${parentUuid}] with type [${parentType}]`);
logger.debug(`Created person [${person._id}] successfully`);

// Run with debug enabled
DEBUG = medic
:*
npm
test
```

### Common Debugging Scenarios

**Scenario 1: "id.startsWith is not a function"**

```typescript
// Add logging
logger.debug(`Parent type: ${typeof qualifier.parent}`);
logger.debug(`Parent value: ${JSON.stringify(qualifier.parent)}`);

// Problem: qualifier.parent is object, not string
// Solution: Use extractUuid()
```

**Scenario 2: "Invalid parent type [undefined]"**

```typescript
// Add logging
const parentDoc = await getMedicDocById(parentUuid);
logger.debug(`Parent doc: ${JSON.stringify(parentDoc)}`);
logger.debug(`Parent type from utils: ${contactTypeUtils.getTypeId(parentDoc)}`);

// Problem: Trying to get type from hydrated object
// Solution: Always fetch full document
```

**Scenario 3: TypeScript Type Errors**

```typescript
// Add type assertions with comments
const parentUuid = (qualifier.parent as Record<string, unknown>)._id as string;  // Safe: validated above

// Or use type guards
if (!isRecord(qualifier.parent)) {
    throw new Error('Invalid parent');
}
const parentId = qualifier.parent._id;  // TypeScript knows it's safe now
```

---

## Future Enhancement Opportunities

### 1. Bulk Operations

```typescript
// Potential API
const createMany = (context: DataContext) => async (qualifiers: ContactQualifier[]) => {
    // Batch validate and create
    return await Promise.all(qualifiers.map(q => create(context)(q)));
};
```

### 2. Partial Updates

```typescript
// Potential API - only update specified fields
const patch = (context: DataContext) => async (
    id: string,
    rev: string,
    changes: Partial<ContactQualifier>
) => {
    const existing = await get(context)(id);
    return await update(context)({...existing, ...changes, _id: id, _rev: rev});
};
```

### 3. Validation Hooks

```typescript
// Potential API - custom validation
type ValidationHook = (qualifier: ContactQualifier) => Promise<void>;

const create = (context: DataContext, hooks: ValidationHook[] = []) => async (
    qualifier: ContactQualifier
) => {
    // Run custom validations
    for (const hook of hooks) {
        await hook(qualifier);
    }
    // Continue with normal flow
};
```

### 4. Transaction Support

```typescript
// Potential API - atomic operations
const transaction = (context: DataContext) => {
    const operations: Promise<any>[] = [];

    return {
        create: (qualifier: ContactQualifier) => {
            operations.push(create(context)(qualifier));
            return this;
        },
        update: (qualifier: ContactQualifier) => {
            operations.push(update(context)(qualifier));
            return this;
        },
        commit: async () => {
            return await Promise.all(operations);
        },
        rollback: () => {
            operations.length = 0;
        }
    };
};
```

---

## Checklist for Adding Similar Features

When adding create/update for a new entity type:

**1. Type Definitions**

- [ ] Define qualifier type (e.g., `ContactQualifier`)
- [ ] Add builder function (e.g., `byContactQualifier`)
- [ ] Add type guard (e.g., `isContactQualifier`)
- [ ] Export from qualifier.ts

**2. Local Implementation**

- [ ] Implement `_create()` method
- [ ] Implement `_update()` method
- [ ] Add validation helpers (type, parent, immutability)
- [ ] Add field hydration logic
- [ ] Add date normalization if needed
- [ ] Export public methods

**3. Remote Implementation**

- [ ] Implement `_create()` API call
- [ ] Implement `_update()` API call
- [ ] Add error handling
- [ ] Export public methods

**4. Public API**

- [ ] Create v1 namespace
- [ ] Add context routing (local vs remote)
- [ ] Export from main index.ts

**5. API Integration**

- [ ] Add controller methods
- [ ] Add routes to routing.js
- [ ] Update error handling middleware

**6. Testing**

- [ ] Unit tests for create (success + error cases)
- [ ] Unit tests for update (success + error cases)
- [ ] Integration tests for API endpoints
- [ ] Integration tests for library methods

**7. Documentation**

- [ ] Update API documentation
- [ ] Add code examples
- [ ] Document validation rules
- [ ] Update changelog

---

## Related Files Reference

**Quick Navigation**:

- Implementation: `shared-libs/cht-datasource/src/local/{person,place,report}.ts`
- Remote: `shared-libs/cht-datasource/src/remote/{person,place,report}.ts`
- Public API: `shared-libs/cht-datasource/src/{person,place,report}.ts`
- Qualifiers: `shared-libs/cht-datasource/src/qualifier.ts`
- Errors: `shared-libs/cht-datasource/src/libs/error.ts`
- Helpers: `shared-libs/cht-datasource/src/local/libs/doc.ts`
- Tests: `shared-libs/cht-datasource/test/local/{person,place,report}.spec.ts`

---

**Last Updated**: 2025-11-04
**Status**: Complete and validated
**Code Quality**: All TypeScript/ESLint checks passing
