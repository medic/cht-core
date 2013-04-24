require('./common');

var
  DB_NAME = 'node-couchdb-test',

  callbacks = {
    A: false,
    B1: false,
    B2: false,
    C: false,
  },

  db = client.db(DB_NAME);

// Init fresh db
db.remove();
db
  .create(function(er) {
    if (er) throw new Error(JSON.stringify(er));
    
    var stream = db.changesStream();
    stream
      .addListener('data', function(change) {
        callbacks['B'+change.seq] = true;
        if (change.seq == 2) {
          stream.close();
        }
      })
      .addListener('end', function() {
        callbacks.C = true;
      });
  });

db.saveDoc({test: 1});
db.saveDoc({test: 2});

db.changes({since: 1}, function(er, r) {
  if (er) throw new Error(JSON.stringify(er));
  callbacks.A = true;
  assert.equal(2, r.results[0].seq);
  assert.equal(1, r.results.length);
});

process.on('exit', function() {
  checkCallbacks(callbacks);
});