# Set default contact for places of users

This script goes through all users and checks if the places they're assigned to has a default contact.  If the place does not have a default contact set, it uses the contact defined for that user to set it as the place's default contact.

A requirement is that each user has both a place and a contact assigned to them.

## Installing and running

To install, `cd` into this directory and call `npm install`

To run, call `COUCH_URL=https://USER:PASSWORD@CHT-URL node index.cjs`. So if your CHT URL was `127-0-0-1.my.local-ip.co:10445` and your admin user login was `medic` and password was `password`, you would call `COUCH_URL=https://medic:password@127-0-0-1.my.local-ip.co:10445 node index.cjs`.

### Sample output

```shell
COUCH_URL=https://medic:password@127-0-0-1.my.local-ip.co:10445 node index.cjs

Start

   Using URL taken from COUCH_URL env var:  https://medic:password@127-0-0-1.my.local-ip.co:10445

   Found 4 users

   Setting default place for user org.couchdb.user:thomas

   Updated 1 users

End

```

## Caveats

* Users must have a place and contact associated with them
* Only places with no default contact will be updated
* If a place had a contact set as default, but that contact was deleted, it is still considered as having a default contact already and will be skipped. The fix to this is to manually set the place to another contact and then unset that to be empty.
* If two users are assigned to the same place, the one that is processed first will be set.  The second (or Nth) user will be skipped because the place will already have a user

## Development

This script has it's own ESLint rules found in the `.eslintrc` file. As of Dec 2022, the main difference is that it uses `ecmaVersion` of `8` instead of `6` like in `cht-core`.  To ensure any changes comply, use this call before committing:

```shell
../../node_modules/.bin/eslint index.js
```

Otherwise, use Docker Helper to spin up a local instance to test against to ensure contacts are set as default for places when users have them both assigned.
