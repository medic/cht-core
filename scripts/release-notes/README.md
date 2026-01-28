# Release notes generator script

## Prerequisites

### Install
* `git` [installed](https://git-scm.com/install/)
* `gh` [installed](https://cli.github.com/)
* `node` and `npm` [installed](https://nodejs.org/en/download)

### Setup
* local clone of [CHT Core repo](https://github.com/medic/cht-core)
* logged in to `gh` by running `gh auth login`
* GitHub account has read access to CHT Core Repo
* Run `npm ci` in the `scripts` directory

## Usage

### CI

Every time a beta branch is cut, CI automatically runs and [saves](https://github.com/actions/upload-artifact) the output of the [release note job](https://github.com/medic/cht-core/actions/workflows/release-notes.yml). Each run will have `release-error` and `release-notes` artifacts.  

To manually re-run the CI, use the `gh` command locally to have the action run on GitHub:

```shell
gh workflow run release-notes.yml
```

The re-run will show up in the [release note job](https://github.com/medic/cht-core/actions/workflows/release-notes.yml) list.

### Running locally

Ensuring you're logged in to `gh`, call the script locally like so:

```shell
GITHUB_TOKEN=$(gh auth token) node index.js
```

Options:
- `--help` - Show the help message
- `--skip-commit-validation` - Skip validation of commits

### Fixing commits

Very likely the CI will have saved a bunch of output in `release-error` as shown below. For each of the commits, follow the steps listed to correctly associate the commit with the milestone. Re-run the CI to test if all commits have been fixed

#### Sample error output

>Some commits included in the release are not associated with a milestone. Commits can be associated with a milestone by:
> 
> 1. Setting the milestone on an issue closed by the commit's PR (issue must be listed in the PR's "Development" links)
> 2. Setting the milestone directly on the commit's PR
> 3. Setting the milestone on an issue referenced in the commit message (e.g. "fix(#1345): ..."
> 
> Commits:
> 
> - https://github.com/medic/cht-core/commit/d57ab5 : chore: bump deep-equal-in-any-order from 2.0.6 to 2.1.0 (#10424)
> - https://github.com/medic/cht-core/commit/f797be : chore: bump globals from 16.3.0 to 16.5.0 (#10431)

