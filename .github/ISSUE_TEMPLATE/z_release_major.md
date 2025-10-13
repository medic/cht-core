---
name: Major/minor release
about: Schedule a major or minor release
title: 'Release x.y.z'
labels: 'Type: Internal process'
assignees: ''

---

# Planning - CHT Community 

- [ ] Create a GH Milestone for the release. We use [semver](http://semver.org) so if there are breaking changes increment the major, otherwise if there are new features increment the minor, otherwise increment the service pack. Breaking changes in our case relate to updated software requirements (egs: CouchDB, node, minimum browser versions), broken backwards compatibility in an api, or a major visual update that requires user retraining.
- [ ] Add all the issues to be worked on to the Milestone. Ideally each minor release will have one or two features, a handful of improvements, and plenty of bug fixes.
- [ ] Identify any features and improvements in the release that need end-user documentation (beyond eng team documentation improvements) and create corresponding issues in the cht-docs repo.
- [ ] Assign an engineer as Release Engineer for this release.

# Development - Release Engineer

When development is ready to begin one of the engineers should be nominated as a Release Engineer. They will be responsible for making sure the following tasks are completed though not necessarily completing them.

- [ ] Checkout to a new `<issue>-update-version` branch (eg: `1234-update-version`) and set the version number in the `package.json` and `package-lock.json`. The easiest way to do this is to use `npm --no-git-tag-version version <major|minor>`. Once the version is updated, submit a PR to `master` branch.
- [ ] Ensure that issues associated with commits merged to `master` since the last release are closed and mapped to the milestone.

# Releasing - Release Engineer

Once the PR has been merged into `master`, and the `master` branch has the new version number, then the release process can start:

- [ ] Create a new release branch from `master` named `<major>.<minor>.x` in `cht-core`. Notify the community by creating a post titled `<major>.<minor>.<patch> Beta Releases` in the [development](https://forum.communityhealthtoolkit.org/c/development/7) category of the CHT forum using this [template](https://forum.communityhealthtoolkit.org/new-topic?title=%3Cmajor%3E.%3Cminor%3E.%3Cpatch%3E%20Beta%20Releases&body=I%27ve%20just%20created%20the%20%60%3Cmajor%3E.%3Cminor%3E.x%60%20release%20branch.%20Please%20be%20aware%20that%20any%20further%20changes%20intended%20for%20this%20release%20will%20have%20to%20be%20merged%20to%20%60master%60%20then%20backported.%20Thanks%21&category=development).
- [ ] Build a beta named `<major>.<minor>.<patch>-beta.1` by creating a lightweight git tag (e.g. `git tag <major>.<minor>.<patch>-beta.1`) and then push the created tag.
- [ ] Once the CI completes successfully notify the community by adding a comment in the forum post created above using this template:
```
I’ve just created the `<major>.<minor>.<patch>-beta.1` tag. 
Please let me know if there’s any final update we need to make. 
If all is good, then in 24h, I will start the release. Thanks!
```
- [ ] The beta tag will automatically trigger the scalability build. Once it passes, download the scalability results on S3 at medic-e2e/scalability/$TAG_NAME. If you do not have access to the scalability results ask someone in the #product-team who has access. Add the release `.json` file to `cht-core/tests/scalability/previous_results`. More info in the  [scalability documentation](https://github.com/medic/cht-core/blob/master/tests/scalability/README.md).
- [ ] Go to the [Issues tab](https://github.com/medic/cht-core/issues) and filter the issues with `is:issue label:"Affects: 4.x.x" ` , replace `4.x.x` with the previous version number. Add any open "known issues" from the prior release that were not fixed in this release. Done by adding the correct `Affects: 4.x.x` label.  
- [ ] Add release notes to the [Core Framework Releases](https://docs.communityhealthtoolkit.org/core/releases/) page:
  - [ ] Create a new document for the release in the [releases folder](https://github.com/medic/cht-docs/tree/main/content/en/core/releases).
  - [ ] Ensure all issues are in the GH Milestone, they have human readable descriptions, and that they're correctly labelled. In particular: they have one "Type" label, "UI/UX" if they change the UI, and "Breaking change" if appropriate.
  - [ ] Use [this script](https://github.com/medic/cht-core/blob/master/scripts/release-notes/index.js) to export the issues into our release note format.
  - [ ] Collect known migration steps, descriptions, screenshots, videos, data, and anything else to help communicate particularly important changes. This information should already be on the issue, but if not, prompt the change author to provide it.
  - [ ] Document any required or recommended upgrades to our other products (eg: cht-conf, cht-gateway, cht-android).
  - [ ] Add the release to the [Supported versions](https://docs.communityhealthtoolkit.org/core/releases/#supported-versions) and update the EOL date of the previous release. Update the status of any releases that are past their End Of Life date. Also add a link in the `Release Notes` section to the new release page.
  - [ ] Ensure that the release notes PR is merged before moving to next step.
- [ ] Create a [new release](https://github.com/medic/cht-core/releases/new) in GitHub, with the naming convention `<major>.<minor>.<patch>`, from the release branch created above as the target branch. Click on the "Choose a tag" dropdown and create a tag for the release with the naming convention `<major>.<minor>.<patch>`. Add a link to the release notes in the description of the release.
- [ ] Once you publish the release, confirm the release build completes successfully and the new release is available on the [market](https://staging.dev.medicmobile.org/_couch/builds_4/_design/builds/_view/releases). Make sure that the document has new entry with `id: medic:medic:<major>.<minor>.<patch>`
- [ ] Upgrade the [demo](https://demo-cht.dev.medicmobile.org/) instance to the newly released version.
- [ ] Use cht-conf to upload the configuration from the `cht-core/config/demo` folder to the `demo-cht.dev` server.
- [ ] Announce the release on the [CHT forum](https://forum.communityhealthtoolkit.org/c/product/releases/26), under the "Product - Releases" category using this [template](https://forum.communityhealthtoolkit.org/new-topic?title=Announcing%20the%20release%20of%20%3Cmajor%3E.%3Cminor%3E.%3Cpatch%3E%20of%20the%20CHT%20Core%20Framework&body=%2AWe%27re%20excited%20to%20announce%20the%20release%20of%20%7B%7Bversion%7D%7D%20of%20CHT%20Core%20Framework%2A%0A%0ASee%20below%20for%20some%20highlights%2C%20read%20the%20%5Brelease%20notes%5D%28PASTE_RELEASE_NOTES_URL_HERE%29%20for%20full%20details.%0A%0AFollowing%20the%20CHT%27s%20support%20policy%2C%20versions%20%7B%7Bversions%7D%7D%20are%20no%20longer%20supported.%20Projects%20running%20these%20versions%20should%20start%20planning%20to%20upgrade%20in%20the%20near%20future.%20For%20more%20details%20read%20the%20CHT%20%5Bsoftware%20support%20documentation%5D%28https%3A%2F%2Fdocs.communityhealthtoolkit.org%2Fcore%2Freleases%2F%23supported-versions%29.%0A%0A%23%23%20%7B%7Bversion%7D%7D%20Highlights%0A%0A%23%23%3A%20%5B%7B%7BHighlight%201%20Title%7D%7D%5D%28PASTE_URL_TO_SECTION_HERE%29%0A%0ADescription%20of%20highlight%20section%0A%0A%23%23%3A%20%5B%7B%7BHighlight%202%20Title%7D%7D%5D%28PASTE_URL_TO%20SECTION_HERE%29%0A%0ADescription%20of%20highlight%20section%0A%0A%23%23%3A%20%5BAnd%20more...%5D%28PASTE_URL_TO_SECTION_HERE%29%0A%0AWe%E2%80%99ve%20also%20implemented%20loads%20of%20other%20improvements%20and%20fixed%20a%20heap%20of%20bugs.&category=releases).
- [ ] Go over the list of commits and individually notify contributing / interested community members about the release. 
- [ ] Mark this issue "done" and close the Milestone.
