var _ = require('underscore'),
    async = require('async'),
    db = require('../../../db'),
    DB_PREFIX = 'medic_api_integration_tests__',
    dbBackups;

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

function assertDb(expectedContents) {
  if(Array.isArray(expectedContents)) {
    expectedContents = {
      medic: expectedContents,
    };
  }
  return new Promise(function(resolve, reject) {
    async.map(
      Object.keys(expectedContents),
      function(dbName, callback) {
        db.request({
          path: DB_PREFIX + dbName + '/_all_docs',
          method: 'GET',
          qs: { include_docs: true },
        }, callback);
      },
      function(err, results) {
        if(err) {
          return reject(err);
        }

        Object.keys(expectedContents).forEach(function(key, i) {
          var expectedContent = expectedContents[key];
          var actualContent = results[i].rows.map(function(row) {
            return _.omit(row.doc, ['_rev']);
          });
          expectedContent.sort(byId);
          actualContent.sort(byId);

          // remove standard ddocs from actualContent
          if (key === 'medic') {
            actualContent = actualContent.filter(function(doc) {
              return doc._id !== '_design/medic' &&
                  doc._id !== '_design/medic-client';
            });
          }

          matchDbs(expectedContent, actualContent);
        });

        resolve();
      }
    );
  });
}

function matchDbs(expected, actual) {
  var errors = [];

  // split expected data into docs with an ID and those without
  var withId = expected.filter(function(doc) { return doc._id; });
  var withoutId = expected.filter(function(doc) { return !doc._id; });

  // check for docs with a specific ID
  withId.forEach(function(expectedDoc) {
    var actualDoc = actual.find(function(actualDoc) {
      return actualDoc._id === expectedDoc._id;
    });
    if(!actualDoc) {
      errors.push('Expected doc not found in the db: ' + JSON.stringify(expectedDoc, null, 2));
      return;
    }
    actual = _.without(actual, actualDoc);
    if (!matches(expectedDoc, actualDoc)) {
      errors.push(
        'Expected doc did not match actual: ' +
        '\n            Expected: ' + JSON.stringify(expectedDoc, null, 2) +
        '\n            Actual:   ' + JSON.stringify(actualDoc, null, 2)
      );
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
      errors.push('Expected doc not found in the db: ' + JSON.stringify(expectedDoc, null, 2));
    }
  });

  if(actual.length) {
    errors.push('Some unexpected docs were found in the database: ' +
        JSON.stringify(actual, null, 2));
  }

  if(errors.length) {
    throw new Error('Database contents not as expected: \n\t' + errors.join(';\n\t'));
  }
}

function initDb(content) {
  dbBackups = {
    audit: db.audit,
    medic: db.medic,
    request: db.request
  };
  db.audit = db.use(DB_PREFIX + 'audit');
  db.medic = db.use(DB_PREFIX + 'medic');

  // hijack calls to db.request and make sure that they are made to the correct
  // database.
  var realRequest = db.request;
  db.request = function() {
    var args = Array.prototype.slice.call(arguments);
    var targetDb = args[0].db;
    if(targetDb && targetDb.indexOf(DB_PREFIX) !== 0) {
      args[0].db = DB_PREFIX + targetDb;
    }
    return realRequest.apply(db, args);
  };

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
          if(err) { return reject(new Error('Error getting _design/medic: ' + err.message)); }
          resolve(medicDdoc);
        });
      })
      .then(function(medicDdoc) {
        delete medicDdoc._rev;
        delete medicDdoc._attachments;
        return new Promise(function(resolve, reject) {
          db.medic.insert(medicDdoc, function(err) {
            if(err) { return reject(new Error('Error inserting _design/medic: ' + err.message)); }
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
            if(err && err.error !== 'conflict') { return reject(new Error('Error inserting admin user: ' + err.message)); }
            resolve();
          });
        });
      })
      .then(function() {
        return new Promise(function(resolve, reject) {
          require('../../../ddoc-extraction').run(function(err) {
            if(err) { return reject(new Error('Error running ddoc-extraction: ' + err.message)); }
            resolve();
          });
        });
      })
      .then(function() {
        // reinstate test DBs
        dbBackups = {
          audit: db.audit,
          medic: db.medic,
          getPath: db.getPath
        };
        db.audit = db.use(DB_PREFIX + 'audit');
        db.medic = db.use(DB_PREFIX + 'medic');
        db.getPath = function() {
          return DB_PREFIX + 'medic/_design/medic/_rewrite';
        };
      })
      .then(function() {
        return new Promise(function(resolve, reject) {
          nonTestDb.get('_design/medic-client', function(err, medicClientDdoc) {
            if(err) { return reject(new Error('Error getting _design/medic-client: ' + err.message)); }
            resolve(medicClientDdoc);
          });
        });
      })
      .then(function(medicClientDdoc) {
        delete medicClientDdoc._rev;
        return new Promise(function(resolve, reject) {
          db.medic.insert(medicClientDdoc, function(err) {
            if(err) { return reject(new Error('Error inserting _design/medic-client: ' + err.message)); }
            resolve();
          });
        });
      });
    })
    .then(function() {
      return Promise.all(_.map(content, function(dbContent, dbName) {
        return Promise.all(dbContent.map(function(doc) {
          return new Promise(function(resolve, reject) {
            db[dbName].insert(doc, function(err) {
              if(err) { return reject(new Error('Error inserting ' + doc._id + ': ' + err.message)); }
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
        if(err && err.statusCode !== 404) {
          return reject(new Error('Error deleting ' + dbName + ': ' + err.message));
        }

        db.db.create(dbName, function(err) {
          if(err) {
            console.log('Could not create' , dbName , 'directly after deleting, pausing and trying again');

            return setTimeout(function() {
              db.db.create(dbName, function(err) {
                if(err) {
                  return reject(new Error('Error creating ' + dbName + ': ' + err.message));
                }

                console.log('After a struggle, at', new Date(), 'Re-created ' + dbName);
                resolve();
              });
            }, 3000);
          } else {
            resolve();
          }
        });
      });
    });
  }));
}

function tearDown() {
  db.audit = dbBackups.audit;
  db.medic = dbBackups.medic;
  db.getPath = dbBackups.getPath;
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

function initSettings(settings) {
  return getDdoc()
    .then(function(ddoc) {
      _.extend(ddoc.app_settings, settings);
      return ddoc;
    })
    .then(function(ddoc) {
      return new Promise(function(resolve, reject) {
        db.medic.insert(ddoc, function(err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });
}

function getDdoc() {
  return new Promise(function(resolve, reject) {
    db.medic.get('_design/medic', function(err, ddoc) {
      if (err) {
        return reject(err);
      }
      resolve(ddoc);
    });
  });
}

module.exports = {
  assertDb: assertDb,
  initDb: initDb,
  initSettings: initSettings,
  getDdoc: getDdoc,
  runMigration: runMigration,
  tearDown: tearDown,
};
