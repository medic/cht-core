# Write User Stories

Given an application area or feature, read the relevant source files and generate user story markdown files following the project's established template.

## Instructions

1. The user will specify an application area (e.g., "Configuration", "Forms", "Targets") and optionally a target directory.
2. Identify the relevant source files:
   - Templates: `admin/src/templates/`
   - Controllers: `admin/src/js/controllers/`
   - For webapp features: `webapp/src/ts/` components and services
3. Read each relevant file before writing any stories — understand the actual behavior, not assumptions.
4. Create one markdown file per user-facing workflow (e.g., list, create, edit, delete, import).
5. Save files to `docs/user-stories/` unless the user specifies a different path. Use kebab-case filenames prefixed with the feature area (e.g., `forms-list.md`, `forms-create.md`).

## Output Format

Each file must follow this exact template:

```markdown
# <Action> <Feature>

## Description
As an administrator, I want to <goal>, so that <reason>.

## Steps
- Login as an administrator
- <step-by-step navigation and actions>

## Acceptance Criteria
- <observable, testable behavior — one bullet per criterion>
- Cover: navigation/access, field validations, required vs optional fields, loading states, error states, success states, UI feedback (tooltips, icons, styles)
```

## Quality Rules

- Every acceptance criterion must be derived from actual source code — no invented behavior.
- Use **bold** for button labels, field names, and UI element names.
- Use `code` for technical values: permission names, field patterns, file names.
- Cover all states: loading, error, empty, success.
- For modals: cover open trigger, fields, validation, submit, cancel, and result.
- For lists: cover columns, row actions, toolbar actions, empty state, loading state.

## Example

See existing stories in `docs/user-stories/` (users-list.md, users-create.md, users-edit.md, users-delete.md, users-import.md) as reference for tone, detail level, and structure.

## Arguments

`$ARGUMENTS` — the application area or feature to document (e.g., "Configuration page", "Upgrade page", "Forms section").
