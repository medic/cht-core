---
name: Patch release
about: Schedule a patch release
title: 'Release x.y.z'
labels: 'Type: Technical issue'
assignees: ''

---

# Planning

- [ ] Create an [organisation wide project](https://github.com/orgs/medic/projects?query=is%3Aopen+sort%3Aname-asc) and add this issue to it.
- [ ] Add all the issues to be worked on to the project.

# Development

When development is ready to begin one of the engineers should be nominated as a Release Manager. They will be responsible for making sure the following tasks are completed though not necessarily completing them.

- [ ] Set the version number in `package.json` and `package-lock.json` and submit a PR to the release branch. The easiest way to do this is to use `npm --no-git-tag-version version patch`.
- [ ] Write an update in the weekly Product Team call agenda summarising development and acceptance testing progress and identifying any blockers. The release manager is to update this every week until the version is released.

# Releasing

Once all issues have passed acceptance testing and have been merged into `master` and backported to the release branch release testing can begin.

- [ ] Build a beta named `<major>.<minor>.<patch>-beta.1` by pushing a git tag and when CI completes successfully notify the QA team that it's ready for release testing.
- [ ] Create a new document in the [release-notes folder](https://github.com/medic/medic/tree/master/release-notes) in `master`. Ensure all issues are in the GH Project, that they're correct labelled, and have human readable descriptions. Use [this script](https://github.com/medic/medic/blob/master/scripts/changelog-generator) to export the issues into our changelog format. Manually document any known migration steps and known issues.
- [ ] Until release testing passes, make sure regressions are fixed in `master`, cherry-pick them into the release branch, and release another beta.
- [ ] Create a release in GitHub from the release branch so it shows up under the [Releases tab](https://github.com/medic/medic/releases) with the naming convention `<major>.<minor>.<patch>`. This will create the git tag automatically. Link to the release notes in the description of the release.
- [ ] Confirm the release build completes successfully and the new release is available on the [market](https://staging.dev.medicmobile.org/builds/releases). Make sure that the document has new entry with `id: medic:medic:<major>.<minor>.<patch>`
- [ ] Add the release to the [Supported versions](https://github.com/medic/medic-docs/blob/master/installation/supported-software.md#supported-versions) and update the EOL date and status of previous releases.
- [ ] Announce the release in #products and #cht-contributors using this template:
```
@channel *Announcing the release of {{version}}*

This release fixes {{number of bugs}}. Read the release notes for full details: {{url}}
```
