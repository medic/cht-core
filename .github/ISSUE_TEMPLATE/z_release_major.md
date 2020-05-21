---
name: Major/minor release
about: Schedule a major or minor release
title: 'Release x.y.z'
labels: 'Type: Internal process'
assignees: ''

---

# Planning

- [ ] Create an [organisation wide project](https://github.com/orgs/medic/projects?query=is%3Aopen+sort%3Aname-asc) and add this issue to it. We use [semver](http://semver.org) so if there are breaking changes increment the major, otherwise if there are new features increment the minor, otherwise increment the service pack. Breaking changes in our case relate to updated software requirements (egs: CouchDB, node, minimum browser versions), broken backwards compatibility in an api, or a major visual update that requires user retraining.
- [ ] Add all the issues to be worked on to the project. Ideally each minor release will have one or two features, a handful of improvements, and plenty of bugs.

# Development

When development is ready to begin one of the engineers should be nominated as a Release Manager. They will be responsible for making sure the following tasks are completed though not necessarily completing them.

- [ ] Set the version number in `package.json` and `package-lock.json` and submit a PR. The easiest way to do this is to use `npm --no-git-tag-version version <major|minor>`.
- [ ] Raise a new issue called `Update dependencies for <version>` with a description that links to [the documentation](https://github.com/medic/medic-docs/blob/master/development/update-dependencies.md). This should be done early in the release cycle so find a volunteer to take this on and assign it to them.
- [ ] Write an update in the weekly Product Team call agenda summarising development and acceptance testing progress and identifying any blockers. The release manager is to update this every week until the version is released.

# Releasing

Once all issues have passed acceptance testing and have been merged into `master` release testing can begin.

- [ ] Create a new release branch from `master` named `<major>.<minor>.x` in medic. Post a message to #development using this template:
```
@core_devs I've just created the `<major>.<minor>.x` release branch. Please be aware that any further changes intended for this release will have to be merged to `master` then backported. Thanks!
```
- [ ] Build a beta named `<major>.<minor>.<patch>-beta.1` by pushing a git tag and when CI completes successfully notify the QA team that it's ready for release testing.
- [ ] [Import translations keys](https://github.com/medic/medic-docs/blob/master/development/translations.md#adding-new-keys) into POE and notify the #translations Slack channel translate new and updated values, for example:
```
@channel I've just updated the translations in POE. These keys have been added: "<added-list>", and these keys have been updated: "<updated-list>"
```
- [ ] Create a new document in the [release-notes folder](https://github.com/medic/medic/tree/master/release-notes) in `master`. Ensure all issues are in the GH Project, that they're correct labelled, and have human readable descriptions. Use [this script](https://github.com/medic/medic/blob/master/scripts/changelog-generator) to export the issues into our changelog format. Manually document any known migration steps and known issues. Provide description, screenshots, videos, and anything else to help communicate particularly important changes. Document any required or recommended upgrades to our other products (eg: medic-conf,  medic-gateway, medic-android). Assign the PR to a) the Director of Technology, and b) an SRE to review and confirm the documentation on upgrade instructions and breaking changes is sufficient.
- [ ] Create a Google Doc in the [blog posts folder](https://drive.google.com/drive/u/0/folders/0B2PTUNZFwxEvMHRWNTBjY2ZHNHc) with the draft of a blog post promoting the release based on the release notes above. Once it's ready ask Max and Alix to review it.
- [ ] Until release testing passes, make sure regressions are fixed in `master`, cherry-pick them into the release branch, and release another beta.
- [ ] [Export the translations](https://github.com/medic/medic-docs/blob/master/development/translations.md#exporting-changes-from-poeditor-to-github), delete empty translation files and commit to `master`. Cherry-pick the commit into the release branch. 
- [ ] Create a release in GitHub from the release branch so it shows up under the [Releases tab](https://github.com/medic/medic/releases) with the naming convention `<major>.<minor>.<patch>`. This will create the git tag automatically. Link to the release notes in the description of the release.
- [ ] Confirm the release build completes successfully and the new release is available on the [market](https://staging.dev.medicmobile.org/builds/releases). Make sure that the document has new entry with `id: medic:medic:<major>.<minor>.<patch>`
- [ ] Follow the instructions for [releasing other products](https://github.com/medic/medic-docs/blob/master/development/releasing.md) that have been updated in this project (eg: medic-conf, medic-gateway, medic-android).
- [ ] Add the release to the [Supported versions](https://github.com/medic/medic-docs/blob/master/installation/supported-software.md#supported-versions) and update the EOL date and status of previous releases.
- [ ] Announce the release in #products and #cht-contributors using this template:
```
@channel *We're excited to announce the release of {{version}}*

New features include {{key_features}}. We've also implemented loads of other improvements and fixed a heap of bugs.

Read the release notes for full details: {{url}}

Following our support policy, versions {{versions}} are no longer supported. Projects running these versions should start planning to upgrade in the near future. For more details read our software support documentation: https://github.com/medic/medic-docs/blob/master/installation/supported-software.md#supported-versions

To see what's scheduled for the next releases have a read of the product roadmap: https://github.com/orgs/medic/projects?query=is%3Aopen+sort%3Aname-asc
```
- [ ] Announce the release on the [CHT forum](https://forum.communityhealthtoolkit.org/), under the "Product - Releases" category. You can use the previous message and omit `@channel`.
- [ ] Mark this issue "done" and close the project.
