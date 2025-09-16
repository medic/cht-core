# Complete Removal of Legacy Navigation Code

## Description

This issue proposes the complete removal of all legacy navigation code paths in the CHT codebase. Currently, the old navigation system is already disabled, but the code still exists and a deprecated permission `can_view_old_navigation` is maintained for backward compatibility.

## Tasks

- [ ] Remove the `OLD_NAV_PERMISSION` constant from `header.component.ts`
- [ ] Remove the `enableOldNav` method from `app.component.ts`
- [ ] Clean up any tests related to old navigation
- [ ] Remove any remaining references to old navigation in the codebase
- [ ] Update documentation to reflect changes

## Implementation Notes

This change should be part of a major release since it could potentially break custom code that still references the old navigation permission.

## Dependencies

None, but should be coordinated with partner implementations to ensure they have time to update any custom code that might rely on these constants.

## Breaking Changes

- Removal of `OLD_NAV_PERMISSION` constant
- Removal of `enableOldNav` method
