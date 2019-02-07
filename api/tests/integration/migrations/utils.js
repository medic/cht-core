const _ = require('underscore');
const {promisify} = require('util');
const fs = require('fs');
const path = require('path');
const readFileAsync = promisify(fs.readFile);
const logger = require('../../../src/logger');
const db = require('../../../src/db');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const byId = (a, b) => {
  if (a._id === b._id) {
    return 0;
  } else if (a._id < b._id) {
    return -1;
  } else {
    return 1;
  }
};

const matches = (expected, actual) => {
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
};

const assertDb = expected => {
  return db.get('medic-test').allDocs({ include_docs: true })
    .then(results => {
      var actual = results.rows.map(row =>_.omit(row.doc, ['_rev']));
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
    });
};

const matchDbs = (expected, actual) => {
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
};

const realPouchDb = db.medic;
const switchToRealDbs = () => {
  db.medic = realPouchDb;
};

const switchToTestDbs = () => {
  db.medic = new PouchDB(
    realPouchDb.name.replace(/medic$/, 'medic-test')
  );
};

const initDb = content => {

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
      return db.medic.bulkDocs([ medic, medicClient ]);
    })
    .then(() => {
      return Promise.all(
        content.map(doc => db.medic.put(doc))
      );
    });
};

const _resetDb = (attempts = 0) => {
  if (attempts === 3) {
    return Promise.reject(new Error('Unable to reset medic-test db'));
  }

  return db.exists('medic-test')
    .then(exists => {
      if (exists) {
        return db.get('medic-test').destroy();
      }
    })
    .then(() => {
      return db.get('medic-test');
    })
    .catch(err => {
      logger.error('Could not create "medic-test" directly after deleting, pausing and trying again');
      logger.error(err);
      return new Promise(resolve => {
        setTimeout(() => resolve(_resetDb(attempts + 1)), 3000);
      });
    });
};

const tearDown = () => {
  switchToRealDbs();
};

const runMigration = migration => {
  var migrationPath = '../../../src/migrations/' + migration;
  migration = require(migrationPath);
  return migration.run();
};

const initSettings = settings => {
  return getSettings()
    .then(function(doc) {
      _.extend(doc.settings, settings);
      return doc;
    })
    .then(doc => db.medic.put(doc))
    .then(() => {
      return new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
    });
};

const getSettings = () => {
  return db.medic.get('settings').catch(err => {
    if (err.status === 404) {
      return { _id: 'settings', settings: {} };
    }
    throw err;
  });
};

const getDdoc = ddocId => db.medic.get(ddocId);

const insertAttachment = (ddoc, attachment) => {
  return db.medic.putAttachment(
    ddoc._id,
    attachment.key,
    ddoc._rev,
    Buffer.from(attachment.content).toString('base64'),
    attachment.content_type
  );
};

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
