# QA Engineer Context: CHT Datasource Create/Update APIs

**Feature**: Create and Update APIs for Person, Place, and Report entities
**Testing Approach**: Multi-layered validation (Unit → Integration → Functional)
**Quality Gates**: TypeScript compilation, ESLint, Unit tests, Integration tests, Coverage thresholds

---

## QA Role and Responsibilities

### What QA Does
✅ **Validate Implementation**: Verify code works as specified
✅ **Run Test Suites**: Execute unit and integration tests
✅ **Fix Test Data**: Correct test fixtures and expectations
✅ **Report Bugs**: Document issues for developers to fix
✅ **Verify Fixes**: Confirm bugs are resolved
✅ **Coverage Analysis**: Ensure adequate test coverage

### What QA Does NOT Do
❌ **Write Implementation Code**: Development is developer responsibility
❌ **Design Architecture**: Architecture decisions are developer responsibility
❌ **Fix Implementation Bugs**: Bug fixes are developer responsibility
❌ **Add Features**: Feature additions are developer responsibility

---

## Test Pyramid Structure

```
                    ┌─────────────────┐
                    │  Manual Testing │  (Minimal)
                    │   Exploratory   │
                    └─────────────────┘
               ┌─────────────────────────┐
               │  Integration Tests       │  (264 tests)
               │  API + Library E2E       │
               └─────────────────────────┘
          ┌──────────────────────────────────┐
          │     Unit Tests                   │  (621 tests)
          │  Component-level validation      │
          └──────────────────────────────────┘
     ┌──────────────────────────────────────────┐
     │        Static Analysis                    │  (TypeScript, ESLint)
     │  Compilation + Linting                    │
     └──────────────────────────────────────────┘
```

---

## Test Execution Workflow

### Phase 1: Static Analysis (Pre-Test)

**Step 1: TypeScript Compilation**
```bash
cd shared-libs/cht-datasource
npm run build
```

**Success Criteria**:
- ✅ 0 compilation errors
- ✅ All types resolve correctly
- ✅ No `any` types in production code

**Common Issues**:
- Type assertion errors
- Missing type definitions
- Incompatible type assignments

**Example Error**:
```
error TS2345: Argument of type 'DataValue' is not assignable to parameter of type 'string | Record<string, unknown> | undefined'.
  Type 'null' is not assignable to type 'string | Record<string, unknown> | undefined'.
```

**QA Action**: Report to developer for fix

---

**Step 2: ESLint Validation**
```bash
cd shared-libs/cht-datasource
npx eslint src/
```

**Success Criteria**:
- ✅ 0 errors
- ✅ 0 warnings
- ✅ Code follows CHT style guide

**Common Issues**:
- Unused variables/imports
- Missing curly braces
- Line length violations (>120 chars)
- Unnecessary type assertions

**Example Error**:
```
error  Unnecessary conditional, expected left-hand side of `&&` operator to be falsy  no-constant-binary-expression
```

**QA Action**: Report to developer for fix

---

### Phase 2: Unit Testing

**Test Execution**:
```bash
cd shared-libs/cht-datasource
npm test
```

**Success Criteria**:
- ✅ All tests passing (621/621)
- ✅ Coverage > 85% statements
- ✅ Coverage > 70% branches
- ✅ No test timeouts
- ✅ Execution time < 5 minutes

**Test Output Format**:
```
  Person.v1.create()
    ✓ creates person with minimal data
    ✓ creates person with provided reported_date
    ✓ throws error if person type is invalid
    ✓ throws error if _rev is provided for create
    ...

  621 passing (280ms)

Coverage Summary:
  Statements   : 88.66% ( 1372/1548 )
  Branches     : 77.96% ( 384/493 )
  Functions    : 86.42% ( 319/369 )
  Lines        : 88.10% ( 1250/1419 )
```

**Coverage Thresholds**:
- **Statements**: > 85% (Target: 88%+)
- **Branches**: > 70% (Target: 77%+)
- **Functions**: > 85% (Target: 86%+)
- **Lines**: > 85% (Target: 88%+)

---

#### Unit Test Categories

**Category 1: Success Path Tests**
Purpose: Verify happy path scenarios work correctly

Examples:
- Creates person with minimal data
- Creates person with all optional fields
- Auto-generates `_id` when not provided
- Auto-generates `reported_date` when not provided
- Accepts ISO 8601 date format
- Accepts Unix timestamp format
- Hydrates parent field with lineage
- Hydrates contact field with lineage

**Validation**:
- ✅ Document created with correct structure
- ✅ All required fields present
- ✅ Auto-generated values are valid
- ✅ Hydrated objects have proper lineage
- ✅ Returns entity with `_id` and `_rev`

---

**Category 2: Validation Error Tests**
Purpose: Verify input validation catches invalid data

Examples:
- Throws error when `type` is missing
- Throws error when `type` is invalid
- Throws error when `name` is missing
- Throws error when `_rev` is provided for create
- Throws error when parent is required but missing
- Throws error when parent provided for top-level type
- Throws error when parent document doesn't exist
- Throws error when parent type is invalid
- Throws error when `reported_date` is invalid

**Validation**:
- ✅ Error is thrown (promise rejected)
- ✅ Error type is `InvalidArgumentError`
- ✅ Error message is descriptive
- ✅ Error message includes field name
- ✅ No database changes made

---

**Category 3: Immutability Tests (Update Only)**
Purpose: Verify immutable fields cannot be changed

Examples:
- Throws error when trying to change `type`
- Throws error when trying to change `reported_date`
- Throws error when trying to change `parent`
- Throws error when trying to change `contact` (place only)
- Throws error when trying to change `form` (report only)

**Validation**:
- ✅ Error is thrown
- ✅ Error type is `InvalidArgumentError`
- ✅ Error message shows current vs attempted value
- ✅ Document remains unchanged

---

**Category 4: Update Requirement Tests**
Purpose: Verify update operations require correct fields

Examples:
- Throws error when `_id` is missing
- Throws error when `_rev` is missing
- Throws error when document doesn't exist

**Validation**:
- ✅ `NotFoundError` thrown for missing document (not `InvalidArgumentError`)
- ✅ `InvalidArgumentError` thrown for missing `_id`/`_rev`
- ✅ Error messages are clear and actionable

---

#### Unit Test Mock Patterns

**Pattern 1: Mock Database (PouchDB)**
```typescript
const medicDb = {
  get: sinon.stub(),
  put: sinon.stub(),
  query: sinon.stub(),
  allDocs: sinon.stub(),
} as unknown as SinonStubbedInstance<PouchDB.Database<Doc>>;
```

**Pattern 2: Mock Settings Service**
```typescript
const settingsService = {
  get: sinon.stub().resolves({
    contact_types: [
      { id: 'district_hospital', parents: [] },
      { id: 'health_center', parents: ['district_hospital'] },
      { id: 'clinic', parents: ['health_center'] },
      { id: 'patient', parents: ['district_hospital', 'health_center', 'clinic'] }
    ]
  })
} as unknown as SinonStubbedInstance<SettingsService>;
```

**Pattern 3: Stub Database Responses**
```typescript
// Get document by ID
medicDb.get
  .withArgs('parent-uuid')
  .resolves({ _id: 'parent-uuid', type: 'contact', contact_type: 'clinic' });

// Create document
medicDb.put.resolves({ ok: true, id: 'new-uuid', rev: '1-abc123' });

// Query forms
medicDb.query
  .withArgs('medic-client/forms', { key: 'pregnancy_home_visit' })
  .resolves({ rows: [{ id: 'form:pregnancy_home_visit' }] });
```

---

#### Common Unit Test Issues

**Issue 1: Missing Mock Setup**
```
Error: TypeError: db.query is not a function
```

**Cause**: Test doesn't stub a function that the code calls

**QA Action**: Add missing stub to test setup
```typescript
// Add to test setup
const queryDocUuidsByKeyInner = sinon.stub().resolves(['form:test_form']);
const queryDocUuidsByKeyOuter = sinon.stub().returns(queryDocUuidsByKeyInner);
```

---

**Issue 2: Incorrect Error Type Expectation**
```
AssertionError: expected promise to be rejected with 'InvalidArgumentError' but got 'NotFoundError'
```

**Cause**: Test expects wrong error type

**QA Action**: Update test expectation
```typescript
// Before (wrong)
await expect(Person.v1.update(context)(qualifier))
  .to.be.rejectedWith(InvalidArgumentError, 'Document not found');

// After (correct)
await expect(Person.v1.update(context)(qualifier))
  .to.be.rejectedWith(NotFoundError, 'Document [uuid] not found');
```

---

**Issue 3: Stub Not Matching Call Pattern**
```
Error: No stub matched call
```

**Cause**: Stub configured with wrong parameters

**QA Action**: Fix stub configuration to match actual call
```typescript
// Before (wrong)
medicDb.get.withArgs('uuid').resolves(doc);

// After (correct - PouchDB calls with options)
medicDb.get.withArgs('uuid', sinon.match.any).resolves(doc);
```

---

### Phase 3: Integration Testing

**Test Execution**:
```bash
cd /path/to/cht-core
npm run integration-all-local > integration_test_log.txt 2>&1
```

**Success Criteria**:
- ✅ All tests passing (264/264)
- ✅ No errors in test execution
- ✅ Execution time < 2 minutes
- ✅ All fixtures properly set up

**Test Environment**:
- Docker Compose multi-container setup
- CouchDB 3-node cluster
- API server
- Sentinel service
- Nginx proxy
- HAProxy load balancer

**Test Output Format**:
```
  POST /api/v1/person
    ✓ creates person with minimal data (43ms)
    ✓ creates person with parent
    ✓ auto-generates _id and reported_date
    ✓ returns 400 when type is missing
    ✓ returns 400 when parent is required but missing
    ...

  264 passing (45s)
  0 failing
```

---

#### Integration Test Categories

**Category A: API Controller Tests**
Location: `tests/integration/api/controllers/`

Purpose: Test REST API endpoints

**Person API Tests** (`person.spec.js`):
- POST /api/v1/person (create)
- PUT /api/v1/person/:uuid (update)
- HTTP status codes (200, 400, 404, 409)
- Request/response formats
- Authentication/authorization

**Place API Tests** (`place.spec.js`):
- POST /api/v1/place (create)
- PUT /api/v1/place/:uuid (update)
- Similar coverage as person tests

**Report API Tests** (`report.spec.js`):
- POST /api/v1/report (create)
- PUT /api/v1/report/:uuid (update)
- Form validation
- Reference validation (contact, patient, place)

---

**Category B: Library Tests**
Location: `tests/integration/shared-libs/cht-datasource/`

Purpose: Test library methods directly

**Person Library Tests** (`person.spec.js`):
- Person.v1.create() with LocalDataContext
- Person.v1.update() with LocalDataContext
- Error handling
- Validation logic

**Place Library Tests** (`place.spec.js`):
- Place.v1.create() with LocalDataContext
- Place.v1.update() with LocalDataContext
- Parent validation
- Contact validation

**Report Library Tests** (`report.spec.js`):
- Report.v1.create() with LocalDataContext
- Report.v1.update() with LocalDataContext
- Form existence validation
- Contact reference validation

---

#### Integration Test Data Requirements

**Test Fixture Hierarchy**:
```javascript
// Setup in before() hook
place0 = await utils.saveDoc({
  type: 'contact',
  contact_type: 'district_hospital',
  name: 'District Hospital'
});

place1 = await utils.saveDoc({
  type: 'contact',
  contact_type: 'health_center',
  name: 'Health Center',
  parent: { _id: place0._id }
});

place2 = await utils.saveDoc({
  type: 'contact',
  contact_type: 'clinic',
  name: 'Clinic',
  parent: { _id: place1._id }
});

contact0 = await utils.saveDoc({
  type: 'contact',
  contact_type: 'patient',
  name: 'Patient',
  parent: { _id: place0._id }
});
```

**Valid Form References**:
- ✅ `pregnancy_home_visit` (real form)
- ❌ `report0`, `report1` (invalid, don't exist)

**Common Test Data Mistakes**:
1. Using `report0` instead of `pregnancy_home_visit` for form field
2. Omitting parent for person/clinic types (required by hierarchy)
3. Providing parent for top-level types like district_hospital (not allowed)
4. Using non-existent UUIDs for references

---

#### Common Integration Test Issues

**Issue 1: Missing Parent Field**
```
Error: 400 - {"code":400,"error":"parent is required for person type [patient]."}
```

**Cause**: Test data missing required parent field

**QA Action**: Add parent to test data
```javascript
// Before (fails)
const personData = {
  type: 'patient',
  name: 'John Doe'
};

// After (passes)
const personData = {
  type: 'patient',
  name: 'John Doe',
  parent: { _id: place0._id }  // Added
};
```

---

**Issue 2: Invalid Form Reference**
```
Error: 400 - {"code":400,"error":"Invalid form [report0]. Form does not exist in database."}
```

**Cause**: Test using non-existent form name

**QA Action**: Use valid form name
```javascript
// Before (fails)
const reportData = {
  type: 'data_record',
  form: 'report0',  // Invalid
  contact: { _id: contact0._id }
};

// After (passes)
const reportData = {
  type: 'data_record',
  form: 'pregnancy_home_visit',  // Valid
  contact: { _id: contact0._id }
};
```

---

**Issue 3: Wrong HTTP Status Code Expected**
```
AssertionError: expected '400 - {...}' to match /404/
```

**Cause**: Implementation returns different status code than expected

**QA Action**: Determine if implementation or test expectation is wrong
- If implementation is wrong → Report bug to developer
- If test expectation is wrong → Update test

**Analysis**:
```javascript
// Test expects 404
await expect(utils.request({ ... }))
  .to.be.rejectedWith('404');

// But implementation returns 400
// Check: Is document truly not found (should be 404)?
// Or is input invalid (should be 400)?
```

---

**Issue 4: Error Message Format Mismatch**
```
AssertionError: expected error message to match /["invalid"]/ but got /[\"invalid\"]/
```

**Cause**: JSON escaping difference in error messages

**QA Action**: Update test expectation to match actual format
```javascript
// Before
.to.be.rejectedWith('["invalidCursor"]');

// After
.to.be.rejectedWith('[\"invalidCursor\"]');
```

---

#### HTTP Status Code Validation

**Critical Status Codes**:

**200 OK**
- Successful create operation
- Successful update operation
- Document returned in response body

**400 Bad Request** (InvalidArgumentError)
- Missing required fields
- Invalid field values
- Validation failures
- Immutable field change attempts

**404 Not Found** (NotFoundError)
- Document doesn't exist
- Referenced document not found (parent, contact, etc.)

**409 Conflict** (ConflictError)
- `_rev` mismatch during update
- Invalid revision format
- Document update conflict

**500 Internal Server Error**
- Unexpected errors
- Database failures
- Should NOT occur for validation issues

---

**Status Code Decision Tree**:
```
Is input invalid?
├─ Yes → 400 Bad Request
│   ├─ Missing required field
│   ├─ Invalid field format
│   ├─ Invalid field value
│   └─ Business rule violation
└─ No → Is resource missing?
    ├─ Yes → 404 Not Found
    │   ├─ Document doesn't exist
    │   └─ Referenced document missing
    └─ No → Is there a conflict?
        ├─ Yes → 409 Conflict
        │   ├─ _rev mismatch
        │   └─ Concurrent modification
        └─ No → 200 OK (success)
```

---

### Phase 4: Test Data Validation

**Purpose**: Ensure test data matches API requirements

**Validation Checklist**:
- [ ] All persons have valid `type` from contact_types
- [ ] All persons with child types have `parent` field
- [ ] All persons with top-level types have NO `parent` field
- [ ] All parents reference existing documents
- [ ] All parent types are in allowed types list
- [ ] All places follow same hierarchy rules as persons
- [ ] All reports have `form` field with valid form name
- [ ] All reports have `contact` field
- [ ] All report references (contact, patient, place) exist
- [ ] All dates are in valid format (ISO or epoch)
- [ ] No `_rev` in create operations
- [ ] Both `_id` and `_rev` present in update operations

---

**Validation Example**:
```javascript
// Check person data before test
const validatePersonData = (data) => {
  assert(data.type, 'type is required');
  assert(data.name, 'name is required');

  const personType = contactTypes.find(t => t.id === data.type);
  assert(personType, `Invalid person type: ${data.type}`);

  const requiresParent = personType.parents && personType.parents.length > 0;
  if (requiresParent) {
    assert(data.parent, `parent is required for type ${data.type}`);
  } else {
    assert(!data.parent, `parent not allowed for top-level type ${data.type}`);
  }

  return true;
};
```

---

## Quality Gates and Acceptance Criteria

### Quality Gate 1: Static Analysis
**Criteria**:
- ✅ TypeScript compilation: 0 errors
- ✅ ESLint: 0 errors, 0 warnings

**Pass/Fail**: Binary - must pass before proceeding to testing

---

### Quality Gate 2: Unit Tests
**Criteria**:
- ✅ All unit tests passing (621/621)
- ✅ Coverage ≥ 85% statements
- ✅ Coverage ≥ 70% branches
- ✅ Coverage ≥ 85% functions
- ✅ Coverage ≥ 85% lines

**Pass/Fail**: Binary - must pass before proceeding to integration tests

---

### Quality Gate 3: Integration Tests
**Criteria**:
- ✅ All integration tests passing (264/264)
- ✅ 0 test failures
- ✅ 0 test errors
- ✅ Execution time < 2 minutes

**Pass/Fail**: Binary - must pass before approving for merge

---

### Quality Gate 4: Functional Validation
**Criteria**:
- ✅ All CRUD operations work correctly
- ✅ All validation rules enforced
- ✅ Correct HTTP status codes returned
- ✅ Error messages are descriptive
- ✅ Data integrity maintained
- ✅ No regressions in existing functionality

**Pass/Fail**: Subjective - QA determines if acceptable

---

## Bug Report Format

### Bug Report Template

**Title**: [Component] Brief description

**Priority**: Critical / High / Medium / Low

**Category**:
- Implementation Bug (requires code fix)
- Test Issue (requires test fix)

**Status**: Open / In Progress / Fixed / Verified

---

**Description**:
Clear description of the issue

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**:
What should happen

**Actual Behavior**:
What actually happens

**Error Message** (if applicable):
```
Full error message or stack trace
```

**Test Location** (if applicable):
- File: `tests/integration/api/controllers/person.spec.js`
- Line: 541
- Test: "returns 400 when _id is missing"

**Context**:
Additional context or related issues

**Suggested Fix** (optional):
If QA has insight into the fix

---

### Bug Example 1: Implementation Bug

**Title**: Report type validation returns 500 instead of 400

**Priority**: Critical

**Category**: Implementation Bug

**Status**: Fixed

**Description**:
When creating a report with invalid `type` field (not "data_record"), the API returns HTTP 500 Internal Server Error instead of 400 Bad Request with validation error.

**Steps to Reproduce**:
1. POST /api/v1/report
2. Body: `{ "type": "invalid-type", "form": "pregnancy_home_visit", "contact": {...} }`
3. Observe response

**Expected Behavior**:
- HTTP 400 Bad Request
- Error message: `"Invalid report type [invalid-type]. Reports must have type 'data_record'."`

**Actual Behavior**:
- HTTP 500 Internal Server Error
- Error message: "Internal Server Error"

**Error Message**:
```
Error: Internal Server Error
    at validateReportType (report.ts:206)
```

**Test Location**:
- File: `tests/integration/shared-libs/cht-datasource/report.spec.js`
- Line: 385
- Test: "throws error when type is not 'data_record'"

**Suggested Fix**:
Add try-catch around type validation or ensure validation throws `InvalidArgumentError` not generic Error

---

### Bug Example 2: Test Issue

**Title**: Person tests missing required parent field

**Priority**: High

**Category**: Test Issue

**Status**: Fixed

**Description**:
Person create tests failing with "parent is required" error because test data doesn't include parent field for person types that require it.

**Steps to Reproduce**:
1. Run integration tests
2. Look for person create tests
3. Notice failures for person types like "patient"

**Expected Behavior**:
Tests should pass with valid test data including parent field

**Actual Behavior**:
Tests fail with validation error: `"parent is required for person type [patient]"`

**Error Message**:
```
400 - {"code":400,"error":"parent is required for person type [patient]."}
```

**Test Location**:
- File: `tests/integration/api/controllers/person.spec.js`
- Multiple tests (lines 100-150)

**Suggested Fix**:
Add parent field to test data:
```javascript
const personData = {
  type: 'patient',
  name: 'John Doe',
  parent: { _id: place0._id }  // Add this
};
```

---

## Test Execution History Tracking

### Session Template

**Date**: YYYY-MM-DD
**QA Engineer**: Name
**Branch**: poc/add_cht_datasource_apis
**Phase**: Unit Testing / Integration Testing

---

**Test Execution Summary**:
- Total Tests: 264
- Passing: 251 (95.1%)
- Failing: 13 (4.9%)

**Issues Found**: 15 total
- Implementation Bugs: 9
- Test Issues: 6

**Issues Fixed This Session**: 36
- Test Data Corrections: 32
- Test Expectation Updates: 4

**Issues Remaining**: 13
- Require Developer Action: 9
- Require Test Updates: 4

---

**Files Modified**:
1. `tests/integration/api/controllers/person.spec.js` - 11 edits
2. `tests/integration/api/controllers/place.spec.js` - 11 edits
3. (list all)

**Time Spent**: X hours

**Next Steps**:
1. Developer to fix 9 implementation bugs
2. QA to update 4 test expectations
3. Re-run full test suite
4. Final verification

---

### Actual Session Example (2025-11-03)

**Date**: 2025-11-03
**QA Engineer**: Claude Code AI
**Branch**: poc/add_cht_datasource_apis
**Phase**: Integration Testing

**Initial State**:
- Total Tests: 264
- Passing: 215 (81.4%)
- Failing: 49 (18.6%)

**After QA Session**:
- Total Tests: 264
- Passing: 251 (95.1%)
- Failing: 13 (4.9%)
- **Improvement**: 36 tests fixed (73% reduction in failures)

**Issues Found**: 15 critical issues
- HTTP Status Codes: 9 issues (400 instead of 404/409)
- Report Validation: 4 issues (type validation crash, missing reference validation)
- Test Design: 2 issues (impossible scenarios)

**Issues Fixed This Session**: 36
- Added missing parent fields: 16 tests
- Fixed form references: 14 tests
- Updated error expectations: 6 tests

**Files Modified**: 6 test files, 49 total edits

**Time Spent**: ~2 hours

**Outcome**: 95.1% test pass rate, ready for developer to fix remaining 13 issues

---

## QA Verification Checklist

### Pre-Merge Verification

**Code Quality**:
- [ ] TypeScript compilation passes (0 errors)
- [ ] ESLint passes (0 errors, 0 warnings)
- [ ] No `any` types in production code
- [ ] No `console.log` statements
- [ ] No commented-out code blocks

**Test Quality**:
- [ ] All unit tests pass (621/621)
- [ ] All integration tests pass (264/264)
- [ ] Test coverage meets thresholds (>85% statements)
- [ ] No skipped tests (`.skip()` removed)
- [ ] No focused tests (`.only()` removed)

**Functional Validation**:
- [ ] Create operations work for all entities
- [ ] Update operations work for all entities
- [ ] Validation rules properly enforced
- [ ] Error messages are descriptive
- [ ] HTTP status codes are correct (400/404/409)
- [ ] Data integrity maintained (immutable fields)
- [ ] Parent relationships validated
- [ ] Field hydration works correctly

**Documentation**:
- [ ] Code has JSDoc comments
- [ ] Complex logic is documented
- [ ] Error handling is clear
- [ ] Examples provided where helpful

**Regression Check**:
- [ ] No existing functionality broken
- [ ] All pre-existing tests still pass
- [ ] No performance degradation
- [ ] No new dependencies added without approval

---

## Common Testing Pitfalls to Avoid

### Pitfall 1: Not Running Full Test Suite
**Problem**: Only running affected tests, missing regressions

**Solution**: Always run full test suite before approval
```bash
npm test  # Run all unit tests
npm run integration-all-local  # Run all integration tests
```

---

### Pitfall 2: Ignoring Test Warnings
**Problem**: Tests pass but warnings indicate issues

**Solution**: Investigate all warnings
```
Warning: Possible unhandled promise rejection
Warning: Test exceeded timeout but passed
Warning: Stub was called more times than expected
```

---

### Pitfall 3: Assuming Test Expectations Are Correct
**Problem**: Test fails, assuming implementation is wrong

**Solution**: Validate test expectations against requirements
- Check if test scenario is actually possible
- Verify expected error type matches specification
- Confirm expected status code is semantically correct

---

### Pitfall 4: Not Testing Error Paths
**Problem**: Only testing success scenarios

**Solution**: Test all error scenarios
- Missing required fields
- Invalid field values
- Boundary conditions
- Conflict scenarios
- Not found scenarios

---

### Pitfall 5: Using Insufficient Test Data
**Problem**: Test data doesn't match real-world complexity

**Solution**: Use realistic test fixtures
- Complete hierarchy (district → center → clinic → person)
- Various contact types
- Real form names
- Valid references

---

## Testing Tools and Commands

### Essential Commands

**Build and Lint**:
```bash
cd shared-libs/cht-datasource
npm run build           # TypeScript compilation
npx eslint src/         # Linting
npm run lint            # Combined linting
```

**Unit Tests**:
```bash
npm test                             # Run all unit tests
npm test test/local/person.spec.ts  # Run specific file
npm test -- --grep "create"         # Run tests matching pattern
npm test -- --reporter json          # JSON output for parsing
```

**Integration Tests**:
```bash
cd /path/to/cht-core
npm run integration-all-local                    # All integration tests
npm run integration-all-local > test_log.txt     # Save output
```

**Coverage**:
```bash
npm test                    # Generates coverage automatically
open coverage/index.html    # View HTML coverage report
```

**Watch Mode** (for development):
```bash
npm test -- --watch        # Re-run tests on file changes
```

---

### Log Analysis

**Grep for failures**:
```bash
cat integration_test_log.txt | grep -E "failing|passing"
cat integration_test_log.txt | grep -A 10 "failing"  # Show failures with context
```

**Count test results**:
```bash
cat integration_test_log.txt | grep -c "passing"
cat integration_test_log.txt | grep -c "failing"
```

**Extract specific test failures**:
```bash
cat integration_test_log.txt | grep -B 5 "AssertionError"
```

**Find error patterns**:
```bash
cat integration_test_log.txt | grep -E "Error:|400|404|409|500"
```

---

### CI/CD Integration

**Pre-Commit Checks**:
```bash
#!/bin/bash
# run-pre-commit-checks.sh

echo "Running pre-commit checks..."

echo "1. TypeScript compilation..."
npm run build || exit 1

echo "2. ESLint..."
npx eslint src/ || exit 1

echo "3. Unit tests..."
npm test || exit 1

echo "✓ All checks passed!"
```

**CI Pipeline Script**:
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: TypeScript compilation
        run: npm run build

      - name: Lint
        run: npx eslint src/

      - name: Unit tests
        run: npm test

      - name: Integration tests
        run: npm run integration-all-local

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## QA Sign-Off Template

### Final QA Report

**Feature**: CHT Datasource Create/Update APIs
**QA Engineer**: [Name]
**Date**: YYYY-MM-DD
**Status**: ✅ APPROVED / ❌ REJECTED

---

**Test Execution Results**:

**Static Analysis**:
- TypeScript Compilation: ✅ PASS (0 errors)
- ESLint: ✅ PASS (0 errors, 0 warnings)

**Unit Tests**:
- Total Tests: 621
- Passing: 621 (100%)
- Failing: 0 (0%)
- Coverage: 88.66% statements, 77.96% branches

**Integration Tests**:
- Total Tests: 264
- Passing: 264 (100%)
- Failing: 0 (0%)
- Execution Time: 45 seconds

---

**Functional Validation**:
- ✅ Create operations work for Person, Place, Report
- ✅ Update operations work for Person, Place, Report
- ✅ Validation rules properly enforced
- ✅ HTTP status codes correct (400/404/409)
- ✅ Error messages descriptive and actionable
- ✅ Immutable fields protected
- ✅ Parent relationships validated
- ✅ Field hydration works correctly
- ✅ Reference validation (reports) working

---

**Regression Check**:
- ✅ No existing functionality broken
- ✅ All pre-existing tests pass
- ✅ No performance issues observed

---

**Issues Found and Resolved**: 15 total
- Implementation bugs: 9 (all fixed by developer)
- Test issues: 6 (all fixed by QA)

---

**Recommendation**: ✅ **APPROVED FOR MERGE**

This feature has passed all quality gates and is ready for production.

**QA Sign-Off**: [Name]
**Date**: YYYY-MM-DD

---

**Next Steps**:
1. Code review by team
2. Merge to main branch
3. Deploy to staging environment
4. Monitor for issues in production

---

## Related Documentation

- **Task Context**: `task-context.md` - Overall feature context
- **Developer Context**: `developer-context.md` - Implementation details
- **Bug Reports**: `QA_SESSION_CONTEXT.md`, `FINAL_REPORTED_DATE_FIX_SUMMARY.md`
- **Test Plans**: `INTEGRATION_TEST_PLAN.md`

---

**Last Updated**: 2025-11-04
**Status**: Complete - All tests passing
**Final Verdict**: ✅ Ready for production
