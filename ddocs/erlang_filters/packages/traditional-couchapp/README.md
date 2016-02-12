### Notes

I've replaced:

    evals = process.binding('evals'),
with:

    evals = require('vm'),

Throughout this module. This is one reason why it's commited (the other being that this seems to be what you do when kanso, note the rest of our app).

I did this because it is a compatibility issue with newer versions of node.

See: https://github.com/kanso/traditional-couchapp/issues/3
