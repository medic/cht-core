---
name: Feature Release
about: Schedule a Feature Release
title: 'Release x.y.z-FR-FEATURE-NAME'
labels: 'Type: Internal process'
assignees: ''

---

When development is ready to begin on a [Feature Release](https://docs.communityhealthtoolkit.org/core/releases/feature_releases/#release-names), an engineer on the appropriate Care Team or Allies should be nominated as a Release Engineer. They will be responsible for making sure the following tasks are followed, though not necessarily doing the work themselves.

# Planning

- [ ] Create a GH Milestone for the release.
- [ ] Add all the issues to be worked on to the Milestone.
- [ ] Have an actual named deployment and specific end user that will be testing this Feature Release. They need to test in production, on the latest version. No speculative Feature Releases.
- [ ] Assign an engineer as Release Engineer for this release.

# Development

- [ ] Create a new release branch in `cht-core` from the most recent release and call it  `<major>.<minor>.<patch>-FR-<FEATURE-NAME>`. If latest is `3.15.0` and the feature is to "allow movies to be uploaded", call it `3.15.0-FR-movie-upload`. Done before the release so all PRs can be set to merge to this branch, and not to `master`.
- [ ] Set the version number in `package.json` and `package-lock.json` and submit a PR. The easiest way to do this is to use `npm --no-git-tag-version version <feature-release>`.
- [ ] Ensure QA is briefed and is partnering with the Trio to ensure early and often checks of the feature are on track to be of production quality from the start.

# Releasing

This is an iterative process and it's assumed there will be multiple numbered releases throughout development of the Feature Release.

- [ ] Build a beta named `<major>.<minor>.<patch>-FR-<FEATURE-NAME>-beta.1` by pushing a git tag and when CI completes successfully notify the QA team that it's ready for release testing. If an updated Feature Release is needed, increment the last `1` by calling it `<major>.<minor>.<patch>-FR-<FEATURE-NAME>-beta.2` etc.

# Close-out

- [ ] Validate with the actual end user that this Feature Release delivers a quantifiable improvement.  If yes, plan on adding the feature to the next minor release by creating a new ticket to merge the code to `master`.  If no, we leave the code dead in this branch, never to be merged to `master`, but still loved all the same.
- [ ] Mark this issue "done" and close the Milestone.
