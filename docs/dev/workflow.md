# Development Workflow

## Weekly iterations

We strive to do weekly iterations with code reviews and production deployments
each week.  An iteration begins with a meeting where the relevant tickets are
discussed, prioritized and assigned.  A ticket can be closed when it is
considered complete by the developer, with unit or functional tests added but
not required.

## Daily stand

Each day, we discuss the progress of the tickets and potential blockers.  If a
ticket will not be completed within an interation time frame, that should be
discussed and become clear during stand.

## Branching 

Typically a small number of developers are working so they can share one 'dev'
branch where new code is developed.  It is at the discretion of the developer
and usually discussed with the team whether to start a separate feature branch
or not.

## Code Review

Before merging code into master/production we should review and test it, so
submit a pull request to the master branch (same repo) and have someone review
and "ok" the branch changes for merge.  If it helps, you can use @username in
the pull request description to notify a specific person about the merge.

On the pull request it is useful to include a short description of the changes,
features or fixes getting merged. These summaries can be used in the release
notes later.

## Production release

Pushed to productiong and merging dev into master should be done frequently,
typically once or twice a week.

### Manual Tests

1. Make sure code review is ok
2. Test new features in Firefox

### Release Steps

1. Tweak version string.

    Edit kanso.json with new version string

2. Include new features in release notes.

    Edit docs/dev/release_notes.md

3. Push to production URL with Kanso.

    kanso push https://medic.iriscouch.com/kujua-export
