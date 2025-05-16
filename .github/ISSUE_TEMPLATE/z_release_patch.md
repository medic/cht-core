---
name: Patch release
about: Schedule a patch release
title: 'Release x.y.z'
labels: 'Type: Internal process'
assignees: ''

---

# Planning - CHT Community 

- [ ] Create an GH Milestone and add this issue to it.
- [ ] Add all the issues to be worked on to the Milestone.
- [ ] Ensure that all issues are labelled correctly, particularly ensure that "Regressions" are labelled with "Affects: <version>" labels. The "Affects" label is used in a link in the Known Issues section of the release notes of that version so it has to match exactly. To make sure the label is correct go to the [release notes](https://docs.communityhealthtoolkit.org/core/releases/#release-notes) and ensure the issue is listed.

# Development - Release Engineer

When development is ready to begin one of the engineers should be nominated as a Release Engineer. They will be responsible for making sure the following tasks are completed though not necessarily completing them.

- [ ] Set the version number in `package.json` and `package-lock.json` and submit a PR to the release branch. The easiest way to do this is to use `npm --no-git-tag-version version patch`.
- [ ] Ensure that issues from merged commits are closed and mapped to a milestone.
- [ ] Write an update in the #product-team Slack channel summarising development and identifying any blockers (the [milestone-status](https://github.com/medic/support-scripts/tree/master/milestone-status) script can be used to get a breakdown of the issues). The Release Engineer is to update this every week until the version is released.

# Releasing - Release Engineer

Once all issues have been merged into `master` then the release process can start:

- [ ] Build a beta named `<major>.<minor>.<patch>-beta.1` by pushing a lightweight git tag (e.g. `git tag <major>.<minor>.<patch>-beta.1`).
- [ ] Once the CI completes successfully notify the team by writing a message in the #development Slack channel:
```
@channel, I’ve just created the `<major>.<minor>.<patch>-beta.1` tag.
Please let me know if there’s any final update we need to make.
If all is good, then in 24h, I will start the release. Thanks!
```
[ ] Add release notes to the [Core Framework Releases](https://docs.communityhealthtoolkit.org/core/releases/) page:
  - [ ] Create a new document for the release in the [releases folder](https://github.com/medic/cht-docs/tree/main/content/en/core/releases).
  - [ ] Ensure all issues are in the GH Milestone, they have human readable descriptions, and that they're correctly labelled. In particular: they have one "Type" label, "UI/UX" if they change the UI, and "Breaking change" if appropriate.
  - [ ] Use [this script](https://github.com/medic/cht-core/blob/master/scripts/release-notes/index.js) to export the issues into our release note format.
  - [ ] Collect known migration steps, descriptions, screenshots, videos, data, and anything else to help communicate particularly important changes. This information should already be on the issue, but if not, prompt the change author to provide it.
  - [ ] Document any required or recommended upgrades to our other products (eg: cht-conf, cht-gateway, cht-android).
- [ ] Create a [new release](https://github.com/medic/cht-core/releases/new) in GitHub, with the naming convention `<major>.<minor>.<patch>`, from the release branch created above as the target branch. Click on the "Choose a tag" dropdown and create a tag for the release with the naming convention `<major>.<minor>.<patch>`. Ensure the release notes PR from above are merged. Add a link to the release notes in the description of the release.
- [ ] Once you publish the release, confirm the release build completes successfully and the new release is available on the [market](https://staging.dev.medicmobile.org/_couch/builds_4/_design/builds/_view/releases). Make sure that the document has new entry with `id: medic:medic:<major>.<minor>.<patch>`
- [ ] Upgrade the [demo](https://demo-cht.dev.medicmobile.org/) instance to the newly released version.
- [ ] Announce the release on the [CHT forum](https://forum.communityhealthtoolkit.org/), under the "Product - Releases" category using this template:
```
*Announcing the release of {{version}} of {{product}}*

This release fixes {{number of bugs}}. Read the [release notes]({{url}}) for full details.
```
- [ ] Go over the list of commits and individually notify contributing / interested community members about the release.
- [ ] Go to the [Issues tab](https://github.com/medic/cht-core/issues) and filter the issues with `is:issue label:"Affects: 4.x.x" ` , replace `4.x.x` with the previous version number. Add any open "known issues" from the prior release that were not fixed in this release. Done by adding the correct `Affects: 4.x.x` label.
- [ ] Mark this issue "done" and close the Milestone.
