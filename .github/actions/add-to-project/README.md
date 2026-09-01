# Add issue to project

Composite action that keeps an issue on the organization project(s) (Projects v2) whose
title matches a regex in sync with assignment: the issue is added on `assigned` events and
removed on `unassigned` events once no assignees remain. To disable removal, trigger the
workflow only on `assigned`.

## Inputs

| Input                 | Required | Default      | Description                                                                 |
|-----------------------|----------|--------------|-----------------------------------------------------------------------------|
| `github-token`        | yes      | —            | Token with the `project` scope. The default `GITHUB_TOKEN` cannot write to organization Projects (v2). |
| `project-title-regex` | no       | `activities` | Case-insensitive regular expression matched against organization project titles. |

## Usage

```yaml
on:
  issues:
    types:
      - assigned
      - unassigned

permissions: {}

jobs:
  add:
    runs-on: ubuntu-latest
    steps:
      - uses: medic/cht-core/.github/actions/add-to-project@master
        with:
          github-token: ${{ secrets.ADD_TO_PROJECT_PAT }}
          project-title-regex: activities
```

When used from this repository, check out the repo first and reference the action as
`./.github/actions/add-to-project` (see `.github/workflows/add-to-project.yml`).

If several projects match the regex, the issue is added to (and removed from) all of
them, with a warning in the job log; if none match on `assigned`, the job fails. Adding
an issue that is already on a board is a no-op on GitHub's side, so repeated assignments
are safe. Removal deletes the project item, so any project field values (status, etc.)
set on it are lost — reassigning adds the issue back as a fresh item.
