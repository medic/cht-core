Couchmark
==========

Wraps couchdb's `follow` to restart at the latest unhandled change by named streams. Marking a change as
handled is optimistic — it occurs as soon as the feed fires the `change` event.

It is for the case when your application is offline whilst documents continue to be inserted into a CouchDB
database.

The feed returned from `couchmark` is a `follow` Feed.

Uses its own database on the same host as the feed's db to mark documents as handled.

Usage
=====

    var feed = couchmark.Feed({
        db: 'http://admin:admin@localhost:5984/app',
        filter: 'app/filter',
        stream: 'mystream',
        couchmarkDb: 'my-db' // defaults to 'couchmark'
    });

    feed.on('change', function(change) {
        // do work
    });

    feed.follow(); // actually starts as soon as couchmark has checked its database
