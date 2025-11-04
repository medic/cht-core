# CHW Historical Targets Implementation Context

## Summary
This document provides context for understanding the CHW Historical Targets feature implementation. The feature allows Community Health Workers (CHWs) to view their previous month's performance indicators alongside current month data in the Analytics tab, following the architectural patterns established by the Supervisor Target Aggregates feature (v4.10).

## Key Architectural Decision: Using Supervisor Aggregates as Reference Model

The implementation heavily leverages the existing **Supervisor Target Aggregates** feature (v4.10) as a reference model for:
- **Service architecture patterns**: How to structure service methods for fetching stored documents
- **UI/UX patterns**: Sidebar filters, period selection, loading states
- **Testing patterns**: Unit test structure, mocking strategies
- **Code style**: CHT coding standards, naming conventions
- **Performance patterns**: Caching strategies, ngZone optimization

## Feature Comparison: CHW vs Supervisor Targets

| Aspect | Supervisor Aggregates (v4.10) | CHW Historical Targets (Our Implementation) |
|--------|-------------------------------|---------------------------------------------|
| **Purpose** | View aggregated targets across multiple CHWs | View individual CHW's historical targets |
| **Users** | Supervisors managing CHWs | Individual CHWs |
| **Component** | `AnalyticsTargetAggregatesComponent` | `AnalyticsTargetsComponent` |
| **Service** | `TargetAggregatesService` (aggregation) | `TargetAggregatesService` (individual) + `RulesEngineService` |
| **Data Source** | Stored aggregate documents | Current: RulesEngine calculation<br>Previous: Stored documents |
| **Period Options** | Current/Previous (aggregated) | Current/Previous (individual) |
| **Sidebar Filter** | Facility + Period selection | Period selection only |
| **Telemetry** | None (only PerformanceService) | None (removed to match supervisor pattern) |
| **Caching** | Component-level | Component-level |
| **Document Pattern** | `aggregate-targets~YYYY-MM~facility~user` | `target~YYYY-MM~contactId~userId` |

## Critical Implementation Details

### 1. Why Rules Engine is Necessary for Current Targets

The **Rules Engine Service** is essential for current month targets because:
- **Real-time calculation**: Current targets need immediate updates as new reports come in
- **Dynamic evaluation**: Rules are evaluated against live data (reports, tasks, contacts)
- **No stored documents yet**: Current month documents are only created at month end
- **Original design**: Master branch has always used RulesEngine for current targets

**Data Flow:**
```
Current Month: User → Component → RulesEngineService → Live Calculation
Previous Month: User → Component → TargetAggregatesService → Stored Documents
```

### 2. Service Architecture Separation

The implementation maintains clean separation:
- **RulesEngineService**: Handles ONLY current period real-time calculations
- **TargetAggregatesService**: Handles ONLY historical/stored document retrieval
- **Component**: Orchestrates between services based on selected period

This separation ensures:
- No coupling between services
- Clear responsibility boundaries
- Easier testing and maintenance
- Consistent with CHT architectural patterns

### 3. Document Storage Pattern

Target documents are stored with pattern: `target~YYYY-MM~contactId~userId`

Example: `target~2025-08~78e9cfa4-daad-4fa4-a75f-47094200f8b0~org.couchdb.user:chw23`

These documents are:
- Created automatically at month end by background processes
- Immutable snapshots of performance
- Retrieved for historical viewing
- Never modified after creation

### 4. Target Types and Behaviors

**Monthly Targets (Reset Each Month):**
- Deaths this month
- Pregnancy registrations this month
- Births this month
- Deliveries this month

**Cumulative Targets (Carry Over):**
- Active pregnancies
- Active pregnancies with visits/contacts

Understanding this distinction is crucial for testing and validation.

## Implementation Phases Summary

### Phase 1: Research & Discovery
- Located Analytics components in `/webapp/src/ts/modules/analytics/`
- Studied Supervisor Target Aggregates implementation as reference
- Understood document storage patterns and retrieval mechanisms

### Phase 2: Initial Implementation (With Issues)
- First attempted to use TargetAggregatesService for both periods
- Added extensive telemetry tracking
- Encountered issues with service coupling and complexity

### Phase 3: Architecture Refactoring
- Separated concerns: RulesEngine for current, TargetAggregates for historical
- Removed telemetry to match supervisor pattern
- Simplified service interfaces and data flow

### Phase 4: Service Extension
- Extended TargetAggregatesService with `getIndividualTargets()` method
- Added proper TypeScript interfaces
- Implemented transformation logic for stored documents
- Fixed translation keys and sort ordering

### Phase 5: Component Integration
- Modified AnalyticsTargetsComponent to use appropriate services
- Added historical data indicators
- Implemented component-level caching
- Added loading and error states

### Phase 6: Comprehensive Testing
- Fixed 17+ test failures from architecture changes
- Updated mocks to new response format
- Added tests for historical retrieval
- Achieved 87%+ code coverage

### Phase 7: Final Cleanup
- Removed experimental code from RulesEngineService
- Consolidated duplicate functionality
- Fixed remaining linting issues
- Verified all integration tests passing

## Common Pitfalls and Solutions

### Pitfall 1: Trying to Use DbService Directly
**Issue**: Attempting to query database directly for current targets
**Solution**: Use RulesEngineService for real-time calculation

### Pitfall 2: Adding Telemetry Everywhere
**Issue**: Over-instrumenting with telemetry tracking
**Solution**: Follow supervisor pattern - use only PerformanceService

### Pitfall 3: Complex Caching in Services
**Issue**: Implementing elaborate caching logic in services
**Solution**: Keep services stateless, cache at component level

### Pitfall 4: Modifying Stored Documents
**Issue**: Attempting to update historical target documents
**Solution**: Treat stored documents as immutable snapshots

## Key Technical Decisions

### 1. No Service-Level Caching
Following the Supervisor pattern, caching is handled at the component level, not in services. This ensures:
- Services remain stateless
- Easier testing
- Clear data flow
- Component controls cache lifecycle

### 2. Response Object Structure // Needs confirmation if this impacts anything else
Changed from returning raw arrays to structured objects:
```typescript
interface TargetResponse {
  targets: Target[];
  is_historical: boolean;
  document_date?: number;
}
```
This provides metadata about the data source and freshness.

### 3. Early Return Pattern // Interesting, it wants to prevent future agents from that mistake
For current period requests to TargetAggregatesService:
```typescript
if (options.reporting_period !== ReportingPeriod.PREVIOUS) {
  throw new Error('Use RulesEngineService for current targets');
}
```
This enforces architectural boundaries and prevents misuse.

### 4. Transformation Logic // Note: Need to verify if this was mistakenly added during testing of 2 configs
Stored targets are transformed to merge with configuration:
- Add display metadata (icons, translations)
- Apply visibility settings
- Set sort order from configuration
- Fix translation keys for proper display

## Testing Strategy

### Unit Testing Approach
- Mock all service dependencies
- Test each service method in isolation
- Verify component orchestration logic
- Test error handling and edge cases

### Integration Testing
- Verify document retrieval from database
- Test complete user workflows
- Validate offline functionality
- Ensure backward compatibility

### Key Testing Patterns
```javascript
// Service mock pattern
targetAggregatesService.getIndividualTargets.resolves({
  targets: [...],
  is_historical: true,
  document_date: Date.now()
});

// Component testing pattern
await component.fetchTargets(ReportingPeriod.PREVIOUS);
expect(component.isShowingHistoricalData).to.be.true;
```

## CHT Coding Standards Adherence

### Naming Conventions
- **snake_case**: Database properties (`contact_id`, `user_id`, `reporting_period`)
- **lowerCamelCase**: TypeScript variables (`fetchTargets`, `isHistorical`)
- **UpperCamelCase**: Classes/Interfaces (`TargetAggregatesService`, `TargetResponse`)

### Code Style
- 2-space indentation throughout
- Arrow functions for callbacks
- `async/await` over promises/callbacks
- Early returns to avoid nesting
- Functions under 15 lines
- Single quotes for strings (except JSON)

### Angular Patterns
- Dependency injection via constructor
- Private methods with underscore prefix (`_fetchStoredIndividualTargets`)
- Public wrapper methods using ngZone
- Proper TypeScript typing

## Validation Checklist

Before considering implementation complete:
- ✅ Current month shows real-time calculated targets
- ✅ Previous month shows stored historical targets
- ✅ Period toggle works seamlessly
- ✅ Loading states display appropriately
- ✅ Error handling with graceful fallbacks
- ✅ Empty state messages for no data
- ✅ All unit tests passing (2471+ tests)
- ✅ Integration tests unchanged and passing
- ✅ TypeScript compilation successful
- ✅ Linting checks pass
- ✅ Code coverage > 85%

## Future Considerations

### Potential Enhancements
1. **Multi-month History**: Extend to show multiple previous months
2. **Export Functionality**: Add ability to export historical data
3. **Comparison View**: Side-by-side current vs previous comparison
4. **Trend Analysis**: Show performance trends over time

### Technical Debt to Monitor
1. Component-level cache could benefit from TTL management
2. Add performance metrics for historical data retrieval

## Key Files for Reference

### Core Implementation
- `/webapp/src/ts/services/target-aggregates.service.ts` - Historical retrieval
- `/webapp/src/ts/services/rules-engine.service.ts` - Current calculation
- `/webapp/src/ts/modules/analytics/analytics-targets.component.ts` - UI orchestration

### Test Files
- `/webapp/tests/karma/ts/services/target-aggregates.service.spec.ts`
- `/webapp/tests/karma/ts/modules/analytics/analytics-targets.component.spec.ts`
- `/tests/integration/api/controllers/targets-historical.spec.js`

### Configuration
- Target configuration in app_settings.json
- Translation keys in messages-en.properties
- Sidebar filter configuration

## Conclusion

The CHW Historical Targets implementation successfully extends the CHT platform to allow CHWs to view their previous month's performance data. By following the Supervisor Target Aggregates pattern and maintaining clean architectural separation between services, the implementation is maintainable, testable, and consistent with CHT standards.

The key insight is understanding that current targets require real-time calculation through the Rules Engine, while historical targets are immutable snapshots retrieved from stored documents. This dual-service approach ensures data accuracy while maintaining performance and offline capabilities.

This context document should enable any developer to understand the implementation decisions, architecture, and patterns used in building this feature.

# Commands

## Testing
- **Unit tests for webapp changes**: `export CHROME_BIN=/usr/bin/chromium-browser && npm run unit-webapp`
- **Run specific webapp tests**: `export CHROME_BIN=/usr/bin/chromium-browser && npm run unit-webapp -- --grep "TestName"`
- **Integration tests**:`source ../ai_tasks_conf/path/to/venv/bin/activate && export CHROME_BIN=/usr/bin/chromium-browser && npm run integration-all-local`
- These test commands should be run from root project directory
- The integration tests take a long time, so they may time out.
- Write the output to a file and read from there.
