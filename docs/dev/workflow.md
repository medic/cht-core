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

## Issues

Issues are managed in Github.  When creating issues assign a difficulty value
by choosing a label.  This is used to track progress, so we have some idea of
how much work we can handle in a week. Use the `wip` label for
work-in-progress.

Issues are mirrored via the Github API to a dev server couch instance just in
case Github decides to disappear. If you create a new repository and want the
issues mirrored then checkout and modify the issues project.  We also maintain
a tiny issue velocity tracker on the dev server, but it's not used that much
yet.

## Commits

Strive to include a ticket number with every commit.  Every commit should be
related to a ticket, in some cases you might create a ticket for the commit
before you push it.  Commit and push, early and often,  but don't introduce
breaking changes if the branch is shared.  In the case you want to commit
and push for feedback, you can try to put breaking commits in a switch so they
don't impede another developer's progress.

Format your commit messages nicely, according to Git standards.  First line
should be a short title/summary (50 characters or so) with more details in a
separate paragraph if necessary, respecting 79 character line widths. Using
`git -av` is recommended to review your diff while you write your commit
message.


## Code Review

Before merging code into master/production we should review and test it, so
submit a pull request to the master branch (same repo) and have someone review
and "ok" the branch changes for merge.  If it helps, you can use @username in
the pull request description to notify a specific person about the merge.

On the pull request it is useful to include a short description of the changes,
features or fixes getting merged. These summaries can be used in the release
notes later.

## Production release

Pushes to production and merging dev into master should be done frequently,
typically once or twice a week.

### Manual Tests

1. Make sure code review is ok
2. Test new features in Firefox and Webkit

### Release Steps

1. Tweak version string.

    Edit kanso.json with new version string

2. Include new feature descriptions in release notes.

    Edit docs/dev/release_notes.md

3. Push to production URL with Kanso.

    kanso push https://medic.iriscouch.com/kujua-base
