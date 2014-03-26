require('./common');

/*
 * Note: If this test fails (specifically the replication part) with an 
 * Erlang stacktrace, this may be due to
 * 
 *   https://issues.apache.org/jira/browse/COUCHDB-1221
 * 
 * I was able to work around this by restarting CouchDB.
 *                                           ~~ https://github.com/hsch/
 */

var
  DB_NAME = 'node-couchdb-test',
  DB_NAME2 = 'node-couchdb-test-mirror',
  TEST_ID = 'my-doc',
  TEST_DOC = {hello: 'world'},

  callbacks = {
    A: false,
    B: false,
    C: false,
    D: false,
    E: false,
    F: false,
    G: false,
    H: false
  };

// Get a list of all databases
client
  .allDbs(function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.A = true;    
    assert.ok('length' in r);
  });

// Get the couch config
client
  .config(function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.B = true;    
    assert.ok('httpd' in r);
  });

// Get some uuids
client
  .uuids(3, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.C = true;    
    assert.equal(3, r.uuids.length);
  });

// Get the couch stats
client
  .stats('httpd_status_codes', '200', function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.D = true;
    assert.deepEqual(['httpd_status_codes'], Object.keys(r));
    assert.deepEqual(['200'], Object.keys(r.httpd_status_codes));
  });

// Find all active tasks
client
  .activeTasks(function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.E = true;
    assert.ok('length' in r);
  });

// Lets create two dbs to test replication
var db = client.db(DB_NAME);
var db2 = client.db(DB_NAME2);

// Here's how we'll actually replicate later.
var replicate = function() {
  client
    .replicate(DB_NAME, DB_NAME2, function(er, r) {
      if (er) {
        if (er.reason && er.reason.indexOf('erlang') > 0) {
          console.error("---------------------------------------------------------------------------------");
          console.error(" Test failed. Possibly due to https://issues.apache.org/jira/browse/COUCHDB-1221");
          console.error(" Try restarting CouchDB for a quick fix.");
          console.error("---------------------------------------------------------------------------------");
        }
        throw new Error(JSON.stringify(er));
      }
      callbacks.F = true;
      assert.ok('session_id' in r);
    });
};

// Create first db, save document, create second db, then
// replicate. And all that in a well-defined order.
db.remove(function() {
  db.create(function() {
    db.saveDoc(TEST_ID, TEST_DOC, function() {
      db2.remove(function() {
        db2.create(function() {
          replicate();
        });
      });
    });
  });
});

// Test connecting to a port where there is no couch
var client2 = couchdb.createClient(3921);
client2._addClientListener('error', function(er) {
  if (er) callbacks.H = true;
});
client2
  .uuids(function(er, r) {
    if (er) callbacks.G = true;
  });

// Cleanup
db.remove();
db2.remove();

process.on('exit', function() {
  checkCallbacks(callbacks);
});