const _ = require('underscore'),
      {promisify} = require('util'),
      fs = require('fs'),
      path = require('path'),
      readFileAsync = promisify(fs.readFile),
      db = require('../../../src/db-nano'),
      logger = require('../../../src/logger'),
      dbPouch = require('../../../src/db-pouch');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

function byId(a, b) {
  if (a._id === b._id) {
    return 0;
  } else if (a._id < b._id) {
    return -1;
  } else {
    return 1;
  }
}

function matches(expected, actual) {
  var i, k;

  if (typeof expected === 'string') {
    return expected === actual;
  }
  if (typeof expected === 'number') {
    return expected === actual;
  }
  if (typeof expected === 'boolean') {
    return expected === actual;
  }
  if (expected instanceof RegExp) {
    return expected.test(actual);
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return false;
    }
    if (actual.length !== expected.length) {
      return false;
    }
    for (i = expected.length - 1; i >= 0; --i) {
      if (!matches(expected[i], actual[i])) {
        return false;
      }
    }
    return true;
  } else {
    if (!matches(Object.keys(expected).sort(), Object.keys(actual).sort())) {
      return false;
    }
    for (k in expected) {
      if (expected.hasOwnProperty(k)) {
        if (!matches(expected[k], actual[k])) {
          return false;
        }
      }
    }
    return true;
  }
}

function assertDb(expected) {
  return new Promise(function(resolve, reject) {
    const options = {
      path: 'medic-test/_all_docs',
      method: 'GET',
      qs: { include_docs: true },
    };
    db.request(options, function(err, results) {
      if (err) {
        return reject(err);
      }

      var actual = results.rows.map(function(row) {
        return _.omit(row.doc, ['_rev']);
      });
      expected.sort(byId);
      actual.sort(byId);

      // remove standard ddocs from actual
      actual = actual.filter(function(doc) {
        return (
          doc._id !== '_design/medic' &&
          doc._id !== '_design/medic-client' &&
          doc._id !== 'settings'
        );
      });

      matchDbs(expected, actual);
      resolve();
    });
  });
}

function matchDbs(expected, actual) {
  var errors = [];

  // split expected data into docs with an ID and those without
  var withId = expected.filter(function(doc) {
    return doc._id;
  });
  var withoutId = expected.filter(function(doc) {
    return !doc._id;
  });

  // check for docs with a specific ID
  withId.forEach(function(expectedDoc) {
    var actualDoc = actual.find(function(actualDoc) {
      return actualDoc._id === expectedDoc._id;
    });
    if (!actualDoc) {
      errors.push(
        'Expected doc not found in the db: ' +
          JSON.stringify(expectedDoc, null, 2)
      );
      return;
    }
    actual = _.without(actual, actualDoc);
    if (!matches(expectedDoc, actualDoc)) {
      errors.push(
        'Expected doc did not match actual: ' +
          '\n            Expected: ' +
          JSON.stringify(expectedDoc, null, 2) +
          '\n            Actual:   ' +
          JSON.stringify(actualDoc, null, 2)
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
    if (found) {
      actual = _.without(actual, found);
    } else {
      errors.push(
        'Expected doc not found in the db: ' +
          JSON.stringify(expectedDoc, null, 2)
      );
    }
  });

  if (actual.length) {
    errors.push(
      `${actual.length} unexpected docs were found in the database: ` +
        JSON.stringify(actual, null, 2)
    );
  }

  if (errors.length) {
    throw new Error(
      'Database contents not as expected: \n\t' + errors.join(';\n\t')
    );
  }
}

const dbPath = db.getPath,
  dbRequest = db.request;
const realPouchDb = dbPouch.medic;
const switchToRealDbs = () => {
  db.request = dbRequest;
  db.getPath = dbPath;
  db.audit = db.use('audit');
  db.medic = db.use('medic');
  dbPouch.medic = realPouchDb;
};

const switchToTestDbs = () => {
  db.medic = db.use('medic-test');
  dbPouch.medic = new PouchDB(
    realPouchDb.name.replace(/medic$/, 'medic-test')
  );

  // hijack calls to db.request and make sure that they are made to the correct
  // database.
  db.request = function() {
    var args = Array.prototype.slice.call(arguments);
    var targetDb = args[0].db;
    if (targetDb) {
      if (targetDb === 'medic') {
        args[0].db = 'medic-test';
      } else if (targetDb !== 'medic-test') {
        throw new Error(`Unexpected targetDb: "${targetDb}"`);
      }
    }
    return dbRequest.apply(db, args);
  };

  db.getPath = function() {
    return 'medic-test/_design/medic/_rewrite';
  };
};

function initDb(content) {

  switchToTestDbs();

  return _resetDb()
    .then(() => {
      const medicPath = path.join(__dirname, '../../../../build/ddocs/medic.json');
      const compiledPath = path.join(__dirname, '../../../../build/ddocs/medic/_attachments/ddocs/compiled.json');
      return Promise.all([ readFileAsync(medicPath), readFileAsync(compiledPath) ]);
    })
    .then(([medicString, compiledString]) => {
      const medicClient = JSON.parse(compiledString).docs
        .find(doc => doc._id === '_design/medic-client');
      const medic = JSON.parse(medicString).docs[0];
      delete medic._attachments;
      return dbPouch.medic.bulkDocs([ medic, medicClient ]);
    })
    .then(() => {
      return Promise.all(
        content.map(doc => dbPouch.medic.put(doc))
      );
    });
}

function _resetDb() {
  return new Promise(function(resolve, reject) {
    db.db.destroy('medic-test', function(err) {
      if (err && err.statusCode !== 404) {
        return reject(
          new Error('Error deleting "medic-test": ' + err.message)
        );
      }

      db.db.create('medic-test', function(err) {
        if (err) {
          logger.error(
            `Could not create "medic-test" directly after deleting, pausing and trying again`
          );

          return setTimeout(function() {
            db.db.create('medic-test', function(err) {
              if (err) {
                return reject(
                  new Error('Error creating "medic-test": ' + err.message)
                );
              }

              logger.info(`After a struggle, at ${new Date()}, re-created "medic-test"`);
              resolve();
            });
          }, 3000);
        } else {
          resolve();
        }
      });
    });
  });
}

function tearDown() {
  switchToRealDbs();
}

function runMigration(migration) {
  var migrationPath = '../../../src/migrations/' + migration;
  migration = require(migrationPath);
  return migration.run();
}

function initSettings(settings) {
  return getSettings()
    .then(function(doc) {
      _.extend(doc.settings, settings);
      return doc;
    })
    .then(function(doc) {
      return new Promise(function(resolve, reject) {
        db.medic.insert(doc, function(err) {
          if (err) {
            return reject(err);
          }
          setTimeout(resolve, 1000);
        });
      });
    });
}

function getSettings() {
  return new Promise(function(resolve, reject) {
    db.medic.get('settings', function(err, doc) {
      if (err) {
        if (err.statusCode === 404) {
          doc = { _id: 'settings', settings: {} };
        } else {
          return reject(err);
        }
      }
      resolve(doc);
    });
  });
}

function getDdoc(ddocId) {
  return new Promise(function(resolve, reject) {
    db.medic.get(ddocId, function(err, ddoc) {
      if (err) {
        return reject(err);
      }
      resolve(ddoc);
    });
  });
}

function insertAttachment(ddoc, attachment) {
  return new Promise(function(resolve, reject) {
    db.medic.attachment.insert(
        ddoc._id, 
        attachment.key, 
        attachment.content, 
        attachment.content_type,
        { rev: ddoc._rev }, 
        function(err) {
          if (err) {
            return reject(err);
          }
          resolve();
    });  
  });
}

module.exports = {
  assertDb: assertDb,
  initDb: initDb,
  initSettings: initSettings,
  getSettings: getSettings,
  runMigration: runMigration,
  tearDown: tearDown,
  getDdoc: getDdoc,
  insertAttachment: insertAttachment
};
