---
name: Major/minor release
about: Schedule a major or minor release
title: 'Release x.y.z'
labels: 'Type: Internal process'
assignees: ''

---

# Planning - Product Manager

- [ ] Create a GH Milestone for the release. We use [semver](http://semver.org) so if there are breaking changes increment the major, otherwise if there are new features increment the minor, otherwise increment the service pack. Breaking changes in our case relate to updated software requirements (egs: CouchDB, node, minimum browser versions), broken backwards compatibility in an api, or a major visual update that requires user retraining.
- [ ] Add all the issues to be worked on to the Milestone. Ideally each minor release will have one or two features, a handful of improvements, and plenty of bug fixes.
- [ ] Identify any features and improvements in the release that need end-user documentation (beyond eng team documentation improvements) and create corresponding issues in the cht-docs repo
- [ ] Assign an engineer as Release Engineer for this release.

# Development - Release Engineer

When development is ready to begin one of the engineers should be nominated as a Release Engineer. They will be responsible for making sure the following tasks are completed though not necessarily completing them.

- [ ] Set the version number in `package.json` and `package-lock.json` and submit a PR. The easiest way to do this is to use `npm --no-git-tag-version version <major|minor>`.
- [ ] Raise a new issue called `Update dependencies for <version>` with a description that links to [the documentation](https://docs.communityhealthtoolkit.org/core/guides/update-dependencies/). This should be done early in the release cycle so find a volunteer to take this on and assign it to them.
- [ ] Raise a new issue called `Update Docker Helper for <version>` with a two line change to update the compose file versions that are used in the staging URLs. You'll need to change the two instances of `staging.dev.medicmobile.org/_couch/builds_4/medic:medic:4.X.X` so `4.x.x` in [this bash script](https://github.com/medic/cht-core/blob/master/scripts/docker-helper-4.x/cht-docker-compose.sh) is the new version being released.
- [ ] Write an update in the weekly [Medic Product Team call agenda](https://docs.google.com/document/d/14AuJ7SerLuOPESBjQlJqpBtzwSAoVf5ykTT7fjyJBT0/edit) summarising development and acceptance testing progress and identifying any blockers (the [milestone-status](https://github.com/medic/support-scripts/tree/master/milestone-status) script can be used to get a breakdown of the issues). The release Engineer is to update this every week until the version is released.

# Releasing - Release Engineer

Once all issues have passed acceptance testing and have been merged into `master` release testing can begin.

- [ ] Create a new release branch from `master` named `<major>.<minor>.x` in `cht-core`. Post a message to #development using this template:
```
@core_devs I've just created the `<major>.<minor>.x` release branch. Please be aware that any further changes intended for this release will have to be merged to `master` then backported. Thanks!
```
- [ ] Build a beta named `<major>.<minor>.<patch>-beta.1` by pushing a git tag and when CI completes successfully notify the QA team that it's ready for release testing.
- [ ] Announce the start of release testing on the [CHT forum](https://forum.communityhealthtoolkit.org/c/product/releases/26), under the "Product - Releases" category using this template:
```
*Release testing has started for {{version}} of {{product}}*

To get a sneak peak at this upcoming release, you can install `<major>.<minor>.<patch>-beta.1` on your testing environment. We suggest you test your forms and workflows with this release candidate version and raise any issues that you experience. This helps to to discover any potential regressions that wouldn't otherwise be caught during release testing.

Keep an eye on the forum for the release announcement in the next couple of weeks!
```
- [ ] Add release notes to the [Core Framework Releases](https://docs.communityhealthtoolkit.org/core/releases/) page:
  - [ ] Create a new document for the release in the [releases folder](https://github.com/medic/cht-docs/tree/main/content/en/core/releases).
  - [ ] Ensure all issues are in the GH Milestone, that they're correctly labelled (in particular: they have the right Type, "UI/UX" if they change the UI, and "Breaking change" if appropriate), and have human readable descriptions.
  - [ ] Use [this script](https://github.com/medic/cht-core/blob/master/scripts/release-notes) to export the issues into our release note format.
  - [ ] Manually document any known migration steps and known issues.
  - [ ] Provide description, screenshots, videos, and anything else to help communicate particularly important changes.
  - [ ] Document any required or recommended upgrades to our other products (eg: cht-conf, cht-gateway, cht-android).
  - [ ] Add the release to the [Supported versions](https://docs.communityhealthtoolkit.org/core/releases/#supported-versions) and update the EOL date and status of previous releases. Also add a link in the `Release Notes` section to the new release page.
  - [ ] Assign the PR to:
    - The Director of Technology
    - An SRE to review and confirm the documentation on upgrade instructions and breaking changes is sufficient
- [ ] Until release testing passes, make sure regressions are fixed in `master`, cherry-pick them into the release branch, and release another beta.
- [ ] Create a release in GitHub from the release branch so it shows up under the [Releases tab](https://github.com/medic/cht-core/releases) with the naming convention `<major>.<minor>.<patch>`. This will create the git tag automatically. Link to the release notes in the description of the release.
- [ ] Confirm the release build completes successfully and the new release is available on the [market](https://staging.dev.medicmobile.org/builds_4/releases). Make sure that the document has new entry with `id: medic:medic:<major>.<minor>.<patch>`
- [ ] Execute the scalability testing suite on the final build and download the scalability results on S3 at medic-e2e/scalability/$TAG_NAME. Add the release `.jtl` file to `cht-core/tests/scalability/previous_results`. More info in the  [scalability documentation](https://github.com/medic/cht-core/blob/master/tests/scalability/README.md).
- [ ] Upgrade the `demo-cht.dev` instance to this version.
- [ ] Announce the release on the [CHT forum](https://forum.communityhealthtoolkit.org/c/product/releases/26), under the "Product - Releases" category using this template:
```
*We're excited to announce the release of {{version}} of {{product}}*

New features include {{key_features}}. We've also implemented loads of other improvements and fixed a heap of bugs.

Read the [release notes]({{url}}) for full details.

Following our support policy, versions {{versions}} are no longer supported. Projects running these versions should start planning to upgrade in the near future. For more details read our [software support documentation](https://docs.communityhealthtoolkit.org/core/releases/#supported-versions).

Check out our [roadmap](https://github.com/orgs/medic/projects/112) to see what we're working on next.
```
- [ ] Add one last update to the [Medic Product Team call agenda](https://docs.google.com/document/d/14AuJ7SerLuOPESBjQlJqpBtzwSAoVf5ykTT7fjyJBT0/edit) and use this meeting to lead an internal release retrospective covering what went well and areas to improve for next time.
- [ ] Mark this issue "done" and close the Milestone.
