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
- [ ] Ensure that issues from merged commits are closed and mapped to a milestone.

# Releasing - Release Engineer

Once all issues have been merged into `master` then the release process can start:

- [ ] Create a new release branch from `master` named `<major>.<minor>.x` in `cht-core`. Post a message to #development Slack channel using this template:
```
@core_devs I've just created the `<major>.<minor>.x` release branch. Please be aware that any further changes intended for this release will have to be merged to `master` then backported. Thanks!
```
- [ ] Build a beta named `<major>.<minor>.<patch>-beta.1` by pushing a lightweight git tag (e.g. `git tag <major>.<minor>.<patch>-beta.1`).
- [ ] Once the CI completes successfully notify the team by writing a message in the #product-team Slack channel:
```
@product_team, I’ve just created the `<major>.<minor>.<patch>-beta.1` tag. 
Please let me know if there’s any final update we need to make. 
If all is good, then in 24h, I will start the release. Thanks!
```
- [ ] Add release notes to the [Core Framework Releases](https://docs.communityhealthtoolkit.org/core/releases/) page:
  - [ ] Create a new document for the release in the [releases folder](https://github.com/medic/cht-docs/tree/main/content/en/core/releases).
  - [ ] Ensure all issues are in the GH Milestone, that they're correctly labelled (in particular: they have the right Type, "UI/UX" if they change the UI, and "Breaking change" if appropriate), and have human readable descriptions.
  - [ ] Use [this script](https://github.com/medic/cht-core/blob/master/scripts/release-notes) to export the issues into our release note format.
  - [ ] Collect known migration steps, descriptions, screenshots, videos, data, and anything else to help communicate particularly important changes. This information should already be on the issue, but if not, prompt the change author to provide it.
  - [ ] Document any required or recommended upgrades to our other products (eg: cht-conf, cht-gateway, cht-android).
  - [ ] Add the release to the [Supported versions](https://docs.communityhealthtoolkit.org/core/releases/#supported-versions) and update the EOL date and status of previous releases. Also add a link in the `Release Notes` section to the new release page.
- [ ] Create a release in GitHub from the release branch so it shows up under the [Releases tab](https://github.com/medic/cht-core/releases) with the naming convention `<major>.<minor>.<patch>`. This will create the git tag automatically. Ensure the release notes PR above is merged. Link to the release notes in the description of the release.
- [ ] Confirm the release build completes successfully and the new release is available on the [market](https://staging.dev.medicmobile.org/_couch/builds_4/_design/builds/_view/releases). Make sure that the document has new entry with `id: medic:medic:<major>.<minor>.<patch>`
- [ ] Execute the scalability testing suite on the final build and download the scalability results on S3 at medic-e2e/scalability/$TAG_NAME. Add the release `.json` file to `cht-core/tests/scalability/previous_results`. More info in the  [scalability documentation](https://github.com/medic/cht-core/blob/master/tests/scalability/README.md).
- [ ] Upgrade the `demo-cht.dev` instance to this version.
- [ ] Use cht-conf to upload the configuration from the `/config/demo` folder to the `demo-cht.dev` server.
- [ ] Announce the release on the [CHT forum](https://forum.communityhealthtoolkit.org/c/product/releases/26), under the "Product - Releases" category using this template:
```
*We're excited to announce the release of {{version}} of {{product}}*

New features include {{key_features}}. We've also implemented loads of other improvements and fixed a heap of bugs.

Read the [release notes]({{url}}) for full details.

Following our support policy, versions {{versions}} are no longer supported. Projects running these versions should start planning to upgrade in the near future. For more details read our [software support documentation](https://docs.communityhealthtoolkit.org/core/releases/#supported-versions).

Check out our [roadmap](https://github.com/orgs/medic/projects/112) to see what we're working on next.
```
- [ ] Add one last update to the #product-team Slack channel and use the thread to lead an internal release retrospective covering what went well and areas to improve for next time.
- [ ] Add any open "known issues" from the prior release that were not fixed in this release. Done by adding the correct `Affects: 4.x.x` label.  
- [ ] Mark this issue "done" and close the Milestone.
