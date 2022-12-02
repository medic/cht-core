---
name: Patch release
about: Schedule a patch release
title: 'Release x.y.z'
labels: 'Type: Internal process'
assignees: ''

---

# Planning - Product Manager

- [ ] Create an GH Milestone and add this issue to it.
- [ ] Add all the issues to be worked on to the Milestone.
- [ ] Ensure that all issues are labelled correctly, particularly ensure that "Regressions" are labelled with "Affects: <version>" labels. The "Affects" label is used in a link in the Known Issues section of the release notes of that version so it has to match exactly. To make sure the label is correct go to the [release notes](https://docs.communityhealthtoolkit.org/core/releases/#release-notes) and ensure the issue is listed.

# Development - Release Engineer

When development is ready to begin one of the engineers should be nominated as a Release Engineer. They will be responsible for making sure the following tasks are completed though not necessarily completing them.

- [ ] Set the version number in `package.json` and `package-lock.json` and submit a PR to the release branch. The easiest way to do this is to use `npm --no-git-tag-version version patch`.
- [ ] Write an update in the weekly Product Team call agenda summarising development and acceptance testing progress and identifying any blockers (the [milestone-status](https://github.com/medic/support-scripts/tree/master/milestone-status) script can be used to get a breakdown of the issues). The Release Engineer is to update this every week until the version is released.
- [ ] Raise a new issue called `Update Docker Helper for <version>` with a two line change to update the compose file versions that are used in the staging URLs. You'll need to change the two instances of `staging.dev.medicmobile.org/_couch/builds_4/medic:medic:4.X.X` so `4.x.x` in [this bash script](https://github.com/medic/cht-core/blob/master/scripts/docker-helper-4.x/cht-docker-compose.sh) is the new version being released.

# Releasing - Release Engineer

Once all issues have passed acceptance testing and have been merged into `master` and backported to the release branch release testing can begin.

- [ ] Build a beta named `<major>.<minor>.<patch>-beta.1` by pushing a git tag and when CI completes successfully notify the QA team that it's ready for release testing.
- [ ] Add release notes to the [Core Framework Releases](https://docs.communityhealthtoolkit.org/core/releases/) page:
    - [ ] Create a new document for the release in the [releases folder](https://github.com/medic/cht-docs/tree/main/content/en/core/releases).
    - [ ] Ensure all issues are in the GH Milestone, that they're correctly labelled (in particular: they have the right Type, "UI/UX" if they change the UI, and "Breaking change" if appropriate), and have human readable descriptions.
    - [ ] Use [this script](https://github.com/medic/cht-core/blob/master/scripts/release-notes) to export the issues into our release note format.
    - [ ] Manually document any known migration steps and known issues.
    - [ ] Add a link to the new release page in the [Release Notes](https://docs.communityhealthtoolkit.org/core/releases/#release-notes) section.
    - [ ] Assign the PR to:
        - The Director of Technology
        - An SRE to review and confirm the documentation on upgrade instructions and breaking changes is sufficient
- [ ] Until release testing passes, make sure regressions are fixed in `master`, cherry-pick them into the release branch, and release another beta.
- [ ] Create a release in GitHub from the release branch so it shows up under the [Releases tab](https://github.com/medic/cht-core/releases) with the naming convention `<major>.<minor>.<patch>`. This will create the git tag automatically. Link to the release notes in the description of the release.
- [ ] Confirm the release build completes successfully and the new release is available on the [market](https://staging.dev.medicmobile.org/builds_4/releases). Make sure that the document has new entry with `id: medic:medic:<major>.<minor>.<patch>`
- [ ] Announce the release on the [CHT forum](https://forum.communityhealthtoolkit.org/), under the "Product - Releases" category using this template:
```
*Announcing the release of {{version}}*

This release fixes {{number of bugs}}. Read the [release notes]({{url}}) for full details.
```
- [ ] Mark this issue "done" and close the Milestone.
