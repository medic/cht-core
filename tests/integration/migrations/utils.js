var DB_PREFIX = 'medic_api_integration_tests__';

var dbBackups;
var _ = require('underscore'),
    db = require('../../../db');

function byId(a, b) {
  if(a._id === b._id) {
    return 0;
  } else if(a._id < b._id) {
    return -1;
  } else {
    return 1;
  }
}

function matches(expected, actual) {
  var i, k;

  if(typeof expected === 'string') { return expected === actual; }
  if(typeof expected === 'number') { return expected === actual; }
  if(typeof expected === 'boolean') { return expected === actual; }
  if(expected instanceof RegExp) {
    return expected.test(actual);
  }
  if(Array.isArray(expected)) {
    if(!Array.isArray(actual)) { return false; }
    if(actual.length !== expected.length) { return false; }
    for(i=expected.length-1; i>=0; --i) {
      if(!matches(expected[i], actual[i])) {
        return false;
      }
    }
    return true;
  } else {
    if(!matches(Object.keys(expected).sort(), Object.keys(actual).sort())) { return false; }
    for(k in expected) {
      if(expected.hasOwnProperty(k)) {
        if(!matches(expected[k], actual[k])) { return false; }
      }
    }
    return true;
  }
}

function assertDb(expectedContent) {
  return new Promise(function(resolve, reject) {
    db.request({
      path: DB_PREFIX + 'medic/_all_docs',
      method: 'GET',
      qs: { include_docs: true },
    }, function(err, result) {
      if(err) {
        return reject(err);
      }

      var actualContent = _.pluck(result.rows, 'doc').map(function(doc) {
        return _.omit(doc, ['_rev']);
      });

      expectedContent.sort(byId);
      actualContent.sort(byId);

      // remove standard ddocs from actualContent
      actualContent = actualContent.filter(function(doc) {
        return doc._id !== '_design/medic' &&
            doc._id !== '_design/medic-client';
      });

      matchDbs(expectedContent, actualContent);

      resolve();
    });
  });
}

function matchDbs(expected, actual) {
  var errors = [];

  // remove revs
  actual = actual.map(_.partial(_.omit, _, ['_rev']));

  // split expected data into docs with an ID and those without
  var withId = expected.filter(function(doc) { return doc._id; });
  var withoutId = expected.filter(function(doc) { return !doc._id; });

  // check for docs with a specific ID
  withId.forEach(function(expectedDoc) {
    var found = actual.find(function(actualDoc) {
      return actualDoc._id === expectedDoc._id && matches(expectedDoc, actualDoc);
    });
    if(found) {
      actual = _.without(actual, found);
    } else {
      errors.push('Expected doc not found in the db: ' + JSON.stringify(expectedDoc));
    }
  });

  // check for docs with an unspecified ID
  withoutId.forEach(function(expectedDoc) {
    var found = actual.find(function(actualDoc) {
      actualDoc = JSON.parse(JSON.stringify(actualDoc));
      delete actualDoc._id;
      return matches(expectedDoc, actualDoc);
    });
    if(found) {
      actual = _.without(actual, found);
    } else {
      errors.push('Expected doc not found in the db: ' + JSON.stringify(expectedDoc));
    }
  });

  if(actual.length) {
    errors.push('Some unexpected docs were found in the database: ' +
        JSON.stringify(actual));
  }

  if(errors.length) {
    throw new Error('Database contents not as expected: \n\t' + errors.join(';\n\t'));
  }
}

function initDb(content) {
  dbBackups = {
    audit: db.audit,
    medic: db.medic,
  };
  db.audit = db.use(DB_PREFIX + 'audit');
  db.medic = db.use(DB_PREFIX + 'medic');

  if(Array.isArray(content)) {
    content = {
      medic: content,
    };
  }

  return _resetDb()
    .then(function() {
      // copy ddocs from non-test db
      var nonTestDb = db.use('medic');
      return new Promise(function(resolve, reject) {
        nonTestDb.get('_design/medic', function(err, medicDdoc) {
          if(err) { return reject(err); }
          resolve(medicDdoc);
        });
      })
      .then(function(medicDdoc) {
        delete medicDdoc._rev;
        delete medicDdoc._attachments;
        return new Promise(function(resolve, reject) {
          db.medic.insert(medicDdoc, function(err) {
            if(err) { return reject(err); }
            resolve();
          });
        });
      })
      .then(function() {
        db.audit = db.use('audit');
        db.medic = db.use('medic');
      })
      .then(function() {
        return new Promise(function(resolve, reject) {
          db.medic.insert({
            _id: 'org.couchdb.user:admin',
            name: 'admin',
            roles: [],
            type: 'user-settings',
            language: 'en',
            known: true,
            facility_id: null,
            contact_id: null,
          }, function(err) {
            // Assume that if the doc already exists, then it's properly set up
            // This may be risky, but hopefully it was done as part of a
            // previous test, or has been set up correctly on a local machine.
            if(err && err.error !== 'conflict') { return reject(err); }
            resolve();
          });
        });
      })
      .then(function() {
        return new Promise(function(resolve, reject) {
          require('../../../ddoc-extraction').run(function(err) {
            if(err) { return reject(err); }
            resolve();
          });
        });
      })
      .then(function() {
        // reinstate test DBs
        dbBackups = {
          audit: db.audit,
          medic: db.medic,
        };
        db.audit = db.use(DB_PREFIX + 'audit');
        db.medic = db.use(DB_PREFIX + 'medic');
      })
      .then(function() {
        return new Promise(function(resolve, reject) {
          nonTestDb.get('_design/medic-client', function(err, medicClientDdoc) {
            if(err) { return reject(err); }
            resolve(medicClientDdoc);
          });
        });
      })
      .then(function(medicClientDdoc) {
        delete medicClientDdoc._rev;
        return new Promise(function(resolve, reject) {
          db.medic.insert(medicClientDdoc, function(err) {
            if(err) { return reject(err); }
            resolve();
          });
        });
      });
    })
    .then(function() {
      return Promise.all(_.map(content, function(content, dbName) {
        return Promise.all(content.map(function(doc) {
          return new Promise(function(resolve, reject) {
            db[dbName].insert(doc, function(err) {
              if(err) { return reject(err); }
              resolve();
            });
          });
        }));
      }));
    });
}

function _resetDb() {
  return Promise.all([DB_PREFIX + 'audit', DB_PREFIX + 'medic'].map(function(dbName) {
    return new Promise(function(resolve, reject) {
      db.db.destroy(dbName, function(err) {
        if(err && err.statusCode !== 404) { return reject(err); }

        db.db.create(dbName, function(err) {
          if(err) { return reject(err); }
          resolve();
        });
      });
    });
  }));
}

function tearDown() {
  db.audit = dbBackups.audit;
  db.medic = dbBackups.medic;
}

function runMigration(migration) {
  try {
    var migrationPath = '../../../migrations/' + migration;
    migration = require(migrationPath);
    return new Promise(function(resolve, reject) {
      try {
        migration.run(function(err) {
          if(err) {
            return reject(err);
          }
          resolve();
        });
      } catch(err) {
        reject(err);
      }
    });
  } catch(err) {
    return Promise.reject(err);
  }
}

module.exports = {
  assertDb: assertDb,
  initDb: initDb,
  runMigration: runMigration,
  tearDown: tearDown,
};
