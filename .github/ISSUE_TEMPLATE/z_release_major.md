---
name: Major/minor release
about: Schedule a major or minor release
title: 'Release x.y.z'
labels: 'Type: Internal process'
assignees: ''

---

# Planning - CHT Community 

- [ ] Create a GH Milestone for the release and add this issue to it. We use [semver](http://semver.org) so if there are breaking changes increment the major, otherwise if there are new features increment the minor, otherwise increment the service pack. Breaking changes for the CHT relate to updated software requirements (for example: CouchDB, node, minimum browser versions), broken backwards compatibility in an API, or a major visual update that requires user retraining.
- [ ] Add all the issues to be worked on to the Milestone. Ideally each minor release will have one or two features, a handful of improvements, and plenty of bug fixes.
- [ ] Ensure that all issues are labelled correctly, particularly "UI/UX" and "Breaking change" labelled issues, if any. 
- [ ] Ensure that "Regressions" are labelled with "Affects: <version>" labels. The "Affects" label is used in a link in the Known Issues section of the release notes of that version so it has to match exactly. To make sure the label is correct go to the [release notes](https://docs.communityhealthtoolkit.org/releases/#release-notes) and ensure the issue is listed.
- [ ] Identify any features and improvements in the release that need end-user documentation (beyond technical documentation improvements) and create corresponding issues in the cht-docs repo.
- [ ] Assign a maintainer as Release Manager for this release.

# Development - Release Manager

When development is ready to begin one of the maintainers should be nominated as a Release Manager. They will be responsible for making sure the following tasks are completed though not necessarily completing them.

- [ ] Checkout to a new `<issue>-update-version` branch (eg: `1234-update-version`) and set the version number in the `package.json` and `package-lock.json`. The easiest way to do this is to use `npm --no-git-tag-version version <major|minor>`. Once the version is updated, submit a PR to `master` branch.
- [ ] Ensure that issues associated with commits merged to `master` since the last release are closed and mapped to the milestone.

# Releasing - Release Manager

Once the PR has been merged into `master`, and the `master` branch has the new version number, then the release process can start:

- [ ] Create a new release branch from `master` named `<major>.<minor>.x` in `cht-core`. Notify the community by creating a post titled `<major>.<minor>.<patch> Beta Releases` in the [development](https://forum.communityhealthtoolkit.org/c/development/7) category of the CHT forum using this [template](https://forum.communityhealthtoolkit.org/new-topic?title=%3Cmajor%3E.%3Cminor%3E.%3Cpatch%3E%20Beta%20Releases&body=I%27ve%20just%20created%20the%20%60%3Cmajor%3E.%3Cminor%3E.x%60%20release%20branch.%20Please%20be%20aware%20that%20any%20further%20changes%20intended%20for%20this%20release%20will%20have%20to%20be%20merged%20to%20%60master%60%20then%20backported.%20Thanks%21&category=development).
- [ ] Build a beta named `<major>.<minor>.<patch>-beta.1` by creating a lightweight git tag (e.g. `git tag <major>.<minor>.<patch>-beta.1`) and then push it (e.g. `git push origin tag  <major>.<minor>.<patch>-beta.1`).
- [ ] Once the CI completes successfully and images are built, notify the community by adding a comment in the forum post created above using this template:
```
I’ve just created the `<major>.<minor>.<patch>-beta.1` tag. 
Please let me know if there’s any final update we need to make. 
If all is good, then in 24h, I will start the release. Thanks!
```
- [ ] Go to the [scalability action](https://github.com/medic/cht-core/actions/workflows/scalability.yml) and on the top right, click into "Run workflow".  Under "Use workflow from" first choose "tags" then select the `<major>.<minor>.<minor>-beta.1` tag created above. Then "Run workflow". Once it passes, check for the scalability results in the ["results" directory](https://github.com/medic/scalability-results/tree/main/results). More info in the  [scalability documentation](https://github.com/medic/cht-core/tree/master/tests/scalability#readme).
- [ ] Before creating the release, run the [helm chart build script](https://github.com/medic/cht-core/blob/master/scripts/build/helm/package-chart.sh) (eg `./package-chart.sh 5.3.0`), commit the new chart and merge the PR so it will be in the release.
- [ ] Go to the [Issues tab](https://github.com/medic/cht-core/issues) and filter the issues with `is:issue label:"Affects: 5.x.x" ` , replace `5.x.x` with the previous version number. Add any open "known issues" from the prior release that were not fixed in this release. Done by adding the correct `Affects: 5.x.x` label.  
- [ ] Add release notes to the [Core Framework Releases](https://docs.communityhealthtoolkit.org/releases/) page:
  - [ ] Create a new document for the release in the [releases folder](https://github.com/medic/cht-docs/tree/main/content/en/releases).
  - [ ] Ensure all issues are in the GH Milestone, they have human readable descriptions, and that they're correctly labelled. In particular: they have one "Type" label, "UI/UX" if they change the UI, and "Breaking change" if appropriate.
  - [ ] Use [this script](https://github.com/medic/cht-core/blob/master/scripts/release-notes/index.js) to export the issues into our release note format.
  - [ ] Collect known migration steps, descriptions, screenshots, videos, data, and anything else to help communicate particularly important changes. This information should already be on the issue, but if not, prompt the change author to provide it.
  - [ ] Document any required or recommended upgrades to our other products (eg: cht-conf, cht-gateway, cht-android).
  - [ ] Add the release to the [Supported versions](https://docs.communityhealthtoolkit.org/core/releases/#supported-versions) and update the EOL date of the previous release. Update the status of any releases that are past their End Of Life date. Also add a link in the `Release Notes` section to the new release page.
  - [ ] Ensure that the release notes PR is merged before moving to next step.
- [ ] Create a [new release](https://github.com/medic/cht-core/releases/new) in GitHub, with the naming convention `<major>.<minor>.<patch>`, from the release branch created above as the target branch. Click on the "Choose a tag" dropdown and create a tag for the release with the naming convention `<major>.<minor>.<patch>`. Add a link to the release notes in the description of the release.
- [ ] Once you publish the release, confirm the release build completes successfully and the new release is available on the `staging.dev.medicmobile.org` by running this `curl` call. Ensure you see the correct `id: medic:medic:<major>.<minor>.<patch>`:
   ```
   curl -qs https://staging.dev.medicmobile.org/_couch/builds_4/_design/builds/_view/releases | jq ".rows[-1] "
   ```
- [ ] Upgrade the [demo](https://demo-cht.dev.medicmobile.org/) instance to the newly released version.
  - [ ] From the "App Management" admin console (`medic` user creds in 1Password), go to "Upgrades" and stage the upgrade for this version.
  - [ ] Clone `cht-core` repo and checkout the target tag (`git checkout <major>.<minor>.x` ) to ensure you have the proper version of the helm charts.
  - [ ] In your terminal, change to the `./cht-core/scripts/build/helm` directory.
  - [ ] Make sure you're using the dev EKS cluster: `kubectl config use-context arn:aws:eks:eu-west-2:720541322708:cluster/dev-cht-eks`
  - [ ] Ensure you have access to [EKS](https://docs.communityhealthtoolkit.org/hosting/medic/) and  to the [`demo-cht` namespace](https://github.com/medic/medic-infrastructure/issues/1344).) by calling this helm command. There should be no errors: `helm list -n demo-cht`
  - [ ] Download the current `values.yaml` data from the demo instance: `helm get values demo-cht --namespace demo-cht > values.yaml`
  - [ ] Edit the `values.yaml` file so `cht_image_tag` and `chtversion` properties have the new tag value `<major>.<minor>.<patch>`.
  - [ ] Use helm to upgrade the instance: `helm upgrade demo-cht . --namespace demo-cht -f values.yaml`
  - [ ] Refresh the "App Management" page and verify the instance upgraded. You may need to wait 5+ minutes until the upgrade succeeds.  Until then, you may see `50x` errors in the browser - be patient!
- [ ] Use cht-conf to upload the configuration from the `cht-core/config/demo` folder to the `demo-cht.dev` server.
- [ ] Announce the release on the Forum under the "Announcements - Releases" category by using this [template](https://forum.communityhealthtoolkit.org/new-topic?title=Announcing%20the%20release%20of%20%3Cmajor%3E.%3Cminor%3E.%3Cpatch%3E%20of%20the%20CHT%20Core%20Framework&body=%2AAnnouncing%20the%20release%20of%20%7B%7Bversion%7D%7D%20of%20%7B%7Bproduct%7D%7D%2A%0AThis%20release%20fixes%20%7B%7Bnumber%20of%20bugs%7D%7D.%20Read%20the%20%5Brelease%20notes%5D%28%7B%7Burl%7D%7D%29%20for%20full%20details.&category=releases).
- [ ] Go over the list of commits and individually notify contributing / interested community members about the release. 
- [ ] Mark this issue "done" and close the Milestone.
