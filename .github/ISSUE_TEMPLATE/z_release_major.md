---
name: Major/minor release
about: Schedule a major or minor release
title: 'Release x.y.z'
labels: 'Type: Internal process'
assignees: ''

---

# Planning - Product Manager

- [ ] Create an [organisation wide project](https://github.com/orgs/medic/projects?query=is%3Aopen+sort%3Aname-asc) and add this issue to it. We use [semver](http://semver.org) so if there are breaking changes increment the major, otherwise if there are new features increment the minor, otherwise increment the service pack. Breaking changes in our case relate to updated software requirements (egs: CouchDB, node, minimum browser versions), broken backwards compatibility in an api, or a major visual update that requires user retraining.
- [ ] Add all the issues to be worked on to the project. Ideally each minor release will have one or two features, a handful of improvements, and plenty of bug fixes.
- [ ] Identify any features and improvements in the release that need end-user documentation (beyond eng team documentation improvements) and create corresponding issues in the cht-docs repo
- [ ] Assign an engineer as Release Manager for this release.
- [ ] Assign product team members to complete end-user documentation improvements for this release.

# Development - Release Manager

When development is ready to begin one of the engineers should be nominated as a Release Manager. They will be responsible for making sure the following tasks are completed though not necessarily completing them.

- [ ] Set the version number in `package.json` and `package-lock.json` and submit a PR. The easiest way to do this is to use `npm --no-git-tag-version version <major|minor>`.
- [ ] Raise a new issue called `Update dependencies for <version>` with a description that links to [the documentation](https://docs.communityhealthtoolkit.org/core/guides/update-dependencies/). This should be done early in the release cycle so find a volunteer to take this on and assign it to them.
- [ ] Go through all features and improvements scheduled for this release and raise cht-docs issues for product education to be written where appropriate. If in doubt, check with the product manager.
- [ ] Write an update in the weekly Product Team call agenda summarising development and acceptance testing progress and identifying any blockers. The release manager is to update this every week until the version is released.
- [ ] Announce the kickoff of development for the release on the [CHT forum](https://forum.communityhealthtoolkit.org), under the "Product - Releases" category.

# Releasing - Release Manager

Once all issues have passed acceptance testing and have been merged into `master` release testing can begin.

- [ ] Create a new release branch from `master` named `<major>.<minor>.x` in `cht-core`. Post a message to #development using this template:
```
@core_devs I've just created the `<major>.<minor>.x` release branch. Please be aware that any further changes intended for this release will have to be merged to `master` then backported. Thanks!
```
- [ ] Build a beta named `<major>.<minor>.<patch>-beta.1` by pushing a git tag and when CI completes successfully notify the QA team that it's ready for release testing.
- [ ] [Import translations keys](https://docs.communityhealthtoolkit.org/core/overview/translations/#adding-new-keys) into POE and notify the #translations Slack channel translate new and updated values, for example:
```
@channel I've just updated the translations in POE. These keys have been added: "<added-list>", and these keys have been updated: "<updated-list>"
```
- [ ] Create a new document in the [release-notes folder](https://github.com/medic/cht-core/tree/master/release-notes) in `master`. Ensure all issues are in the GH Project, that they're correctly labelled (in particular: they have the right Type, "UI/UX" if they change the UI, and "Breaking change" if appropriate), and have human readable descriptions. Use [this script](https://github.com/medic/cht-core/blob/master/scripts/changelog-generator) to export the issues into our changelog format. Manually document any known migration steps and known issues. Provide description, screenshots, videos, and anything else to help communicate particularly important changes. Document any required or recommended upgrades to our other products (eg: medic-conf,  medic-gateway, medic-android). Assign the PR to a) the Director of Technology, and b) an SRE to review and confirm the documentation on upgrade instructions and breaking changes is sufficient.
- [ ] Until release testing passes, make sure regressions are fixed in `master`, cherry-pick them into the release branch, and release another beta.
- [ ] [Export the translations](https://docs.communityhealthtoolkit.org/core/overview/translations/#exporting-changes-from-poeditor-to-github), delete empty translation files and commit to `master`. Cherry-pick the commit into the release branch. 
- [ ] Create a release in GitHub from the release branch so it shows up under the [Releases tab](https://github.com/medic/cht-core/releases) with the naming convention `<major>.<minor>.<patch>`. This will create the git tag automatically. Link to the release notes in the description of the release.
- [ ] Confirm the release build completes successfully and the new release is available on the [market](https://staging.dev.medicmobile.org/builds/releases). Make sure that the document has new entry with `id: medic:medic:<major>.<minor>.<patch>`
- [ ] Upgrade the `demo-cht.dev` instance to this version.
- [ ] Follow the instructions for [releasing other products](https://docs.communityhealthtoolkit.org/core/guides/releasing/) that have been updated in this project (eg: medic-conf, medic-gateway, medic-android).
- [ ] Add the release to the [Supported versions](https://docs.communityhealthtoolkit.org/core/overview/supported-software/) and update the EOL date and status of previous releases.

# Communicating - Product Manager

- [ ] Ask the Product Designer to create release artwork
- [ ] Create a DRAFT blog post on medic.org Wordpress site promoting the release using on the release notes and artwork above. Once it's ready ask the Comms Officer to review and publish it.
- [ ] Announce the release in #products using this template:
```
@channel *We're excited to announce the release of {{version}}*

New features include {{key_features}}. We've also implemented loads of other improvements and fixed a heap of bugs.

Read the release notes for full details: {{url}}

Following our support policy, versions {{versions}} are no longer supported. Projects running these versions should start planning to upgrade in the near future. For more details read our software support documentation: https://docs.communityhealthtoolkit.org/core/overview/supported-software/

See what's scheduled for the next releases: https://github.com/orgs/medic/projects?query=is%3Aopen+sort%3Aname-asc
```
- [ ] Announce the release on the [CHT forum](https://forum.communityhealthtoolkit.org/c/product/releases/26), under the "Product - Releases" category. You can use the previous message and omit `@channel`.
- [ ] Announce the release of new documentation for features and improvements in the release on the [CHT Forum](https://forum.communityhealthtoolkit.org/c/product/documentation/28), under the "Product - Documentation" category.
- [ ] Schedule a Release communication call to educate stakeholders on product and documentation improvements
- [ ] Mark this issue "done" and close the project.
