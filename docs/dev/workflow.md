# Development Workflow

## Branching and Code Review

### Share dev branch or create feature branch

Typically a small number of developers are working so they can share one 'dev'
branch where new code is developed.  It is at the discretion of the developer
and usually discussed with the team whether to start a separate feature branch
or not.

### Do code review

Before merging code into master/production we should review and test it, so
submit a pull request to the master branch (same repo) and have someone review
and "ok" the new code for merge.  If it helps, you can use @username in the
pull request description to notify a specific person about the merge.


## Merging master and final release steps

Merging dev into master should be done frequently, typically once or twice a
week.

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
