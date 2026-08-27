# AndraBot

Static checks for pull requests opened by external contributors. For every PR whose author
is not an owner, member or collaborator of the repository (and is not a bot), it checks that:

- the PR description follows the repository's pull request template — every template
  section is present, in order, and filled in;
- the `License` section of the template, if there is one, was left intact;
- the PR is linked to an issue in the same organization, through a closing keyword
  (`Closes #1234`) or the "Development" sidebar;
- the PR author is assigned to that issue.

Anything that fails is listed in a single comment on the PR, which is re-posted whenever its
content changes so the author gets notified. The PR carries the failure label while checks
fail and the success label once they all pass; the job fails while any check fails. Draft PRs
are skipped.

The texts of the comments live in [`andra-bot-messages/`](andra-bot-messages/README.md) and
are read at run time, so they can be edited without touching the script.

## Usage

```yaml
name: AndraBot

# pull_request_target is required so the workflow has a write token to comment on PRs
# from forks. It is safe here because nothing from the PR is checked out or executed:
# the action reads the PR template and the PR data through the API only.
on:
  pull_request_target:
    types: [opened, edited, synchronize, reopened, ready_for_review]

permissions: {}

concurrency:
  group: andra-bot-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: read
      pull-requests: write
    steps:
      - uses: medic/cht-core/.github/actions/andrabot@master
```

No checkout is needed. To try out changes to the action from a branch, point `uses` at the
branch instead of `master`.

### Inputs

| Input | Default | Description |
| ----- | ------- | ----------- |
| `token` | `${{ github.token }}` | Token used for the API calls. Needs `pull-requests: write` and `issues: read`. |
| `pr-template` | `.github/PULL_REQUEST_TEMPLATE.md` | Path of the PR template on the default branch of the repository the PR targets. |
| `failure-label` | `Waiting for contributor` | Label set on the PR while any check fails. |
| `success-label` | `Ready for review` | Label set on the PR once every check passes. |

### Example with inputs

All inputs are optional. A repository that keeps its template under `docs/` and uses
different labels would configure the same workflow as:

```yaml
name: AndraBot

on:
  pull_request_target:
    types: [opened, edited, synchronize, reopened, ready_for_review]

permissions: {}

concurrency:
  group: andra-bot-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: read
      pull-requests: write
    steps:
      - uses: medic/cht-core/.github/actions/andrabot@master
        with:
          pr-template: docs/pull_request_template.md
          failure-label: needs contributor input
          success-label: ready for review
```

## Development

The action is a composite action running [`andra-bot.js`](andra-bot.js) through
`actions/github-script`, so there is nothing to build. The unit tests live in
`webapp/tests/mocha/unit/testingtests/andra-bot.spec.js` and run with the webapp mocha
suite (`cd webapp && npm run unit:mocha`).
