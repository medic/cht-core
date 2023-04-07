<!--
Please use semantic PR Titles
Format: <type>(#<issue number>): <subject>

feat(#1234): add hat wobble
^--^ (#^--^) ^------------^
|      |     |
|      |     + - > subject
|      |
|      + ------- > issue number
|
+ -------------- > type: chore, feat, fix, perf, refactor, style, or test.

feat: new feature for the user, not a new feature for build script
fix: bug fix for the user, not a fix to a build script
perf: optimizing for performance
chore: updating grunt tasks etc; no production code change
test: adding missing tests, refactoring tests; no production code change
style: formatting, missing semi colons, etc; no production code change
refactor: refactoring production code, eg. renaming a variable
-->

# Description

[description]

medic/cht-core#[number]

# Code review checklist
<!-- Remove or comment out any items that do not apply to this PR; in the remaining boxes, replace the [ ] with [x]. -->
- [ ] Readable: Concise, well named, follows the [style guide](https://docs.communityhealthtoolkit.org/contribute/code/style-guide/), documented if necessary.
- [ ] Documented: Configuration and user documentation on [cht-docs](https://github.com/medic/cht-docs/)
- [ ] Tested: Unit and/or e2e where appropriate
- [ ] Internationalised: All user facing text
- [ ] Backwards compatible: Works with existing data and configuration or includes a migration. Any breaking changes documented in the release notes.

# Compose URLs
<!-- Do not change these!  CI will automatically update these to be the deep URLs -->
If Build CI hasn't passed, these may 404:

* __CHT_CORE_COMPOSE_URL__
* __COUCH_SINGLE_COMPOSE_URL__
* __COUCH_CLUSTER_COMPOSE_URL__

# License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.

