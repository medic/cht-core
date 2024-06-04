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

- [ ] Checkout to a new `<issue>-update-version` branch (eg: `1234-update-version`) and set the version number in the `package.json` and `package-lock.json`. The easiest way to do this is to use `npm --no-git-tag-version version <major|minor>`. Once the version is updated, submit a PR to `master` branch.
- [ ] Ensure that issues associated with commits merged to `master` since the last release are closed and mapped to the milestone.

# Releasing - Release Engineer

Once the PR has been merged into `master`, and the `master` branch has the new version number, then the release process can start:

- [ ] Create a new release branch from `master` named `<major>.<minor>.x` in `cht-core`. Post a message to #development Slack channel using this template:
```
@core_devs I've just created the `<major>.<minor>.x` release branch. Please be aware that any further changes intended for this release will have to be merged to `master` then backported. Thanks!
```
- [ ] Build a beta named `<major>.<minor>.<patch>-beta.1` by creating a lightweight git tag (e.g. `git tag <major>.<minor>.<patch>-beta.1`) and then push the created tag.
- [ ] Once the CI completes successfully notify the team by writing a message in the #product-team Slack channel:
```
@product_team, I’ve just created the `<major>.<minor>.<patch>-beta.1` tag. 
Please let me know if there’s any final update we need to make. 
If all is good, then in 24h, I will start the release. Thanks!
```
- [ ] The beta tag will automatically trigger the scalability build. Once it passes, download the scalability results on S3 at medic-e2e/scalability/$TAG_NAME. If you do not have access to the scalability results ask someone in the #product-team who has access. Add the release `.json` file to `cht-core/tests/scalability/previous_results`. More info in the  [scalability documentation](https://github.com/medic/cht-core/blob/master/tests/scalability/README.md).
- [ ] Add release notes to the [Core Framework Releases](https://docs.communityhealthtoolkit.org/core/releases/) page:
  - [ ] Create a new document for the release in the [releases folder](https://github.com/medic/cht-docs/tree/main/content/en/core/releases).
  - [ ] Ensure all issues are in the GH Milestone, they have human readable descriptions, and that they're correctly labelled. In particular: they have one "Type" label, "UI/UX" if they change the UI, and "Breaking change" if appropriate.
  - [ ] Use [this script](https://github.com/medic/cht-core/blob/master/scripts/release-notes/index.js) to export the issues into our release note format.
  - [ ] Collect known migration steps, descriptions, screenshots, videos, data, and anything else to help communicate particularly important changes. This information should already be on the issue, but if not, prompt the change author to provide it.
  - [ ] Document any required or recommended upgrades to our other products (eg: cht-conf, cht-gateway, cht-android).
  - [ ] Add the release to the [Supported versions](https://docs.communityhealthtoolkit.org/core/releases/#supported-versions) and update the EOL date of the previous release. Update the status of any releases that are past their End Of Life date. Also add a link in the `Release Notes` section to the new release page.
- [ ] Create a release in GitHub from the release branch so it shows up under the [Releases tab](https://github.com/medic/cht-core/releases) with the naming convention `<major>.<minor>.<patch>`. In the releases tab, you select the "Choose a tag", type tag in the search box, then create a tag for the release `<major>.<minor>.<patch>`. Next, change the Target dropdown to the release branch (eg: `4.4.x`). Ensure the release notes PR above is merged. Add a link to the release notes in the description of the release.
- [ ] Once you publish the release, confirm the release build completes successfully and the new release is available on the [market](https://staging.dev.medicmobile.org/_couch/builds_4/_design/builds/_view/releases). Make sure that the document has new entry with `id: medic:medic:<major>.<minor>.<patch>`
- [ ] Upgrade the [demo](https://demo-cht.dev.medicmobile.org/) instance to the newly released version.
- [ ] Use cht-conf to upload the configuration from the `/config/demo` folder to the `demo-cht.dev` server.
- [ ] Announce the release on the [CHT forum](https://forum.communityhealthtoolkit.org/c/product/releases/26), under the "Product - Releases" category using this template:
```
*We're excited to announce the release of {{version}} of {{product}}*

See below for some highlights, read the [release notes]({{<paste-url>}}) for full details.

Following our support policy, versions {{versions}} are no longer supported. Projects running these versions should start planning to upgrade in the near future. For more details read our [software support documentation](https://docs.communityhealthtoolkit.org/core/releases/#supported-versions).

Check out our [roadmap](https://github.com/orgs/medic/projects/112/views/21) to see what else is currently being working on.

## {{version}} Highlights

### [{{Highlight 1}}]({{<paste-url to section>}})

{{description of highlight section}}

### ### [{{Highlight 2}}]({{<paste-url to section>}})

{{description of highlight section}}

### [And more...]({{paste-url to section}})

We’ve also implemented loads of other improvements and fixed a heap of bugs.

```
- [ ] Add one last update to the #product-team Slack channel and use the thread to lead an internal release retrospective covering what went well and areas to improve for next time.
- [ ] Go to the [Issues tab](https://github.com/medic/cht-core/issues) and filter the issues with `is:issue label:"Affects: 4.x.x" ` , replace `4.x.x` with the previous version number. Add any open "known issues" from the prior release that were not fixed in this release. Done by adding the correct `Affects: 4.x.x` label.  
- [ ] Mark this issue "done" and close the Milestone.
