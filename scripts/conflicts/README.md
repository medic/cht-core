# Conflict scripts

**THESE ARE A WORK IN PROGRESS.**

We're looking to build up a library of scripts to help with bulk conflict management and resolution.

Individual document conflicts are probably best resolved in Fauxton's interface.

## Tools

### diff.js

Pass a Medic CouchDB url, and it outputs diffs for all 2-rev (ie one main and one leaf) conflicts, skipping over more complicated conflicts.

```
node diff.js http://someserver.app.medicmobile.org/medic
```

TODO:
 - An option to output the main, the leaf and the diff to an output directory to use with external tools etc

### auto-resolve.js

**MASSIVE WORK IN PROGRESS**

Pass a Medic CouchDB url, and it attempts to resolve conflicts for you.
```
node auto-resolve.js http://someserver.app.medicmobile.org/medic
```

This is currently a big work in progress, and I wouldn't bother to use it. The architecture I went with needs to be flipped around to allow for more complicated inspection of the diff, though even then it might not work great.

TODO:
 - Change structure so that there are a collection of strategies, and we walk through them one by one (as opposed to walking through the diffs one by one). Each strategy will take `mine`, `theirs` and the diff array. It makes changes to `mine`, and if it makes any changes it deletes items from the diff array once it's done with them. If once all strategies have run there are no more diff items, resolve the conflict
     + Strategy: merge mark as read
     + Strategy: Ignore _rev changes
     + Strategy: Sentinel history _revs (if the same sentinel has run ignore the _rev metadata of `theirs`)
     + Strategy: Message ids (try to work out if we can ignore some message ids being different)
 - UUID collision detection: use some obvious fields (`type`, `name` maybe, `parent` maybe) to detect whether something is a UUID collision and ignore it as too hard
     + Output a possible split solution for tech leads to manually upload if they want

### TODO: resolve.js

**DOES NOT EXIST**

Given a UUID, 'resolve' this document by deleting all conflicting revs.

Support passing in a JSON file as the new head revision.
