require('./common');

var
  DB_NAME = 'node-couchdb-test',
  TEST_ID = 'my-doc',
  TEST_ID2 = 'my-doc2',
  TEST_DOC = {hello: 'world'},
  createUpdate = function(rev) { return {_id: TEST_ID, _rev: rev, hello: 'universe'}; },

  callbacks = {
    A: false,
    B: false,
    C: false,
    D: false,
    E: false,
    F: false,
    G: false,
    H: false,
    I: false,
    J: false,
    K: false,
    L: false,
    M: false,
    N: false,
    O: false,
    P: false,
    Q: false,
    R: false,
    S: false,
    T: false,
    U: false,
    V: false,
    W: false,
    X: false
  },

  db = client.db(DB_NAME);

// Cleanup if test crashed in the middle
db.remove();

// Make sure our test db does not exist yet
db
  .exists(function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.A = true;
    assert.equal(false, r);
  });

// Now create it
db
  .create(function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.B = true;
  });

// Make sure that worked
db
  .exists(function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.C = true;
    assert.equal(true, r);
  });

// Create a document with a given id
db
  .saveDoc(TEST_ID, TEST_DOC, function(er, r) {

    // Remember revisions for save and update tests.
    var revisions = {
    };

    if (er) throw new Error(JSON.stringify(er));
    callbacks.D = true;
    assert.equal(TEST_ID, r.id);
    assert.ok('rev' in r);
    revisions.first = r.rev; // keep for next test

    // Get the document, check contents
    db
      .getDoc(TEST_ID, function(er, doc) {
        if (er) throw new Error(JSON.stringify(er));
        callbacks.U = true;
        assert.equal(doc.hello, TEST_DOC.hello);
      });

    // Update the document, check if the revision parameter works
    db
      .saveDoc(createUpdate(revisions.first), function(er, r) {
        if (er) throw new Error(JSON.stringify(er));
        callbacks.D = true;
        assert.equal(TEST_ID, r.id);
        assert.ok('rev' in r);
        revisions.second = r.rev;

        // Get document without revision, must contain the latest text.
        db
          .getDoc(TEST_ID, function(er, doc) {
            if (er) throw new Error(JSON.stringify(er));
            callbacks.V = true;
            assert.notEqual(doc.hello, TEST_DOC.hello);
            assert.equal(doc._rev, revisions.second);
          });

        // Get document with first revision, must contain the earlier text.
        db
          .getDoc(TEST_ID, revisions.first, function(er, doc) {
            if (er) throw new Error(JSON.stringify(er));
            callbacks.W = true;
            assert.equal(doc.hello, TEST_DOC.hello);
            assert.equal(doc._rev, revisions.first);
          });
          
        // Get document with latest revision explicitly, must contain the latest text.
        db
          .getDoc(TEST_ID, revisions.second, function(er, doc) {
            if (er) throw new Error(JSON.stringify(er));
            callbacks.X = true;
            assert.notEqual(doc.hello, TEST_DOC.hello);
            assert.equal(doc._rev, revisions.second);
          });
      });
  });

// Let couch create a document id for us
db
  .saveDoc(TEST_DOC, function(er, doc) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.E = true;

    // And lets try to delete this one right away
    db
      .removeDoc(doc.id, doc.rev, function(er, r) {
        if (er) throw new Error(JSON.stringify(er));
        callbacks.F = true;
      });
  });

// Lets check how we are doing here
db
  .info(function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.G = true;
    assert.equal(2, r.doc_count);
  });

// Lets test copying
db
  .copyDoc(TEST_ID, TEST_ID2, function(er, copy) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.H = true;

    // Now lets try to do this again, but this time we need the destRev
    db
      .copyDoc(TEST_ID, TEST_ID2, copy.rev, function(er, r) {
        if (er) throw new Error(JSON.stringify(er));
        callbacks.I = true;
      });
  });

// Get a list of all docs
db
  .allDocs(function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.J = true;
    assert.equal(3, r.total_rows);
    assert.equal(3, r.rows.length);
  });

// Make sure query options work
db
  .allDocs({limit: 2}, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.K = true;
    assert.equal(2, r.rows.length);
  });

// Test allDocsBySeq
db
  .allDocsBySeq(function(er, r) {
    /*
     * An error here is perfectly valid as of CouchDB 0.11. The _all_docs_by_seq API
     * has been replaced by _changes.
     */
    if (er && er.error == 'not_found' && er.reason == 'missing') {
      callbacks.L = true;
      return;
    }
    /*
     * If there is as an error different from 404, it may still be a problem.
     */
    if (er) throw new Error(JSON.stringify(er));
    callbacks.L = true;
    assert.ok('rows' in r);
  });

// Test compact
db
  .compact(function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.M = true;
    assert.ok('ok' in r);
  });

// Test bulk docs
db
  .bulkDocs({
    docs: [
      {_id: '1'},
      {_id: '2'},
    ]
  }, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.N = true;
    assert.equal('1', r[0].id);
    assert.equal('2', r[1].id);
  });

// Test temp views
db
  .tempView({
    map: function() {
      emit(null, null);
    }
  }, {include_docs: true}, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.O = true;
    assert.ok('total_rows' in r);
  });

// Test view cleanup
db
  .viewCleanup(function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.P = true;
    assert.ok(r.ok);
  });

// Test save design doc
db
  .saveDesign('nice', {
    views: {
      one: {
        map: function() {
          emit(null, null)
        }
      }
    }
  }, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.Q = true;
    assert.ok('ok' in r);
    assert.ok('_design/nice', r.id);
  });

// Try alternative syntax
db
  .saveDesign({
    _id: 'other',
    views: {
      example: {
        map: function() {
          emit(null, null)
        }
      }
    }
  }, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.R = true;
    assert.ok('ok' in r);
    assert.ok('_design/other', r.id);
  });

// Test compact on design
db
  .compact('nice', function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.S = true;
    assert.ok('ok' in r);
  });

// Test view querying
db
  .view('nice', 'one', {limit: 1}, function(er, r) {
    if (er) throw new Error(JSON.stringify(er));
    callbacks.T = true;
    assert.equal(1, r.rows.length);
  });

process.on('exit', function() {
  checkCallbacks(callbacks);
});