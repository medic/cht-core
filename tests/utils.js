const _ = require('underscore'),
  auth = require('./auth')(),
  constants = require('./constants'),
  { spawn } = require('child_process'),
  rpn = require('request-promise-native'),
  htmlScreenshotReporter = require('protractor-jasmine2-screenshot-reporter');
const specReporter = require('jasmine-spec-reporter').SpecReporter;

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));
const db = new PouchDB(`http://${constants.COUCH_HOST}:${constants.COUCH_PORT}/${constants.DB_NAME}`, { auth });
const sentinel = new PouchDB(`http://${constants.COUCH_HOST}:${constants.COUCH_PORT}/${constants.DB_NAME}-sentinel`, { auth });

let originalSettings;
let e2eDebug;

// First Object is passed to http.request, second is for specific options / flags
// for this wrapper
const request = (options, { debug } = {}) => {
  options = typeof options === 'string' ? { path: options } : _.clone(options);
  if (!options.noAuth) {
    options.auth = options.auth || auth;
  }
  options.uri = options.uri || `http://${constants.API_HOST}:${options.port || constants.API_PORT}${options.path}`;
  options.json = options.json === undefined ? true : options.json;

  if (debug) {
    console.log('!!!!!!!REQUEST!!!!!!!');
    console.log('!!!!!!!REQUEST!!!!!!!');
    console.log(JSON.stringify(options));
    console.log('!!!!!!!REQUEST!!!!!!!');
    console.log('!!!!!!!REQUEST!!!!!!!');
  }

  options.transform = (body, response, resolveWithFullResponse) => {
    // we might get a json response for a non-json request.
    if (response.headers['content-type'].startsWith('application/json') && !options.json) {
      response.body = JSON.parse(response.body);
    }
    // return full response if `resolveWithFullResponse` or if non-2xx status code (so errors can be inspected)
    return resolveWithFullResponse || !(/^2/.test('' + response.statusCode)) ? response : response.body;
  };

  const deferred = protractor.promise.defer();
  rpn(options)
    .then((resp) => deferred.fulfill(resp))
    .catch(err => {
      err.responseBody = err.response && err.response.body;
      deferred.reject(err);
    });
  return deferred.promise;
};

// Update both ddocs, to avoid instability in tests.
// Note that API will be copying changes to medic over to medic-client, so change
// medic-client first (api does nothing) and medic after (api copies changes over to
// medic-client, but the changes are already there.)
const updateSettings = updates => {
  if (originalSettings) {
    throw new Error('A previous test did not call revertSettings');
  }
  return request({
    path: '/api/v1/settings',
    method: 'GET',
  })
    .then(settings => {
      originalSettings = settings;
      // Make sure all updated fields are present in originalSettings, to enable reverting later.
      Object.keys(updates).forEach(updatedField => {
        if (!_.has(originalSettings, updatedField)) {
          originalSettings[updatedField] = null;
        }
      });
      return;
    })
    .then(() => {
      return request({
        path: '/api/v1/settings?replace=1',
        method: 'PUT',
        body: updates,
      });
    });
};

const revertSettings = () => {
  if (!originalSettings) {
    return Promise.resolve(false);
  }
  return request({
    path: '/api/v1/settings?replace=1',
    method: 'PUT',
    body: originalSettings,
  }).then(() => {
    originalSettings = null;
    return true;
  });
};

const PERMANENT_TYPES = ['translations', 'translations-backup', 'user-settings', 'info'];

const deleteAll = (except = []) => {
  // Generate a list of functions to filter documents over
  const ignorables = except.concat(
    doc => PERMANENT_TYPES.includes(doc.type),
    'service-worker-meta',
    constants.USER_CONTACT_ID,
    'migration-log',
    'resources',
    'branding',
    'partners',
    'settings',
    /^form:contact:/,
    /^_design/
  );
  const ignoreFns = [];
  const ignoreStrings = [];
  const ignoreRegex = [];
  ignorables.forEach(i => {
    if (typeof i === 'function') {
      ignoreFns.push(i);
    } else if (typeof i === 'object') {
      ignoreRegex.push(i);
    } else {
      ignoreStrings.push(i);
    }
  });

  ignoreFns.push(doc => ignoreStrings.includes(doc._id));
  ignoreFns.push(doc => ignoreRegex.find(r => doc._id.match(r)));

  // Get, filter and delete documents
  return module.exports
    .requestOnTestDb({
      path: '/_all_docs?include_docs=true',
      method: 'GET',
    })
    .then(({ rows }) =>
      rows
        .filter(({ doc }) => !ignoreFns.find(fn => fn(doc)))
        .map(({ doc }) => {
          doc._deleted = true;
          doc.type = 'tombstone'; // circumvent tombstones being created when DB is cleaned up
          return doc;
        })
    )
    .then(toDelete => {
      const ids = toDelete.map(doc => doc._id);
      if (e2eDebug) {
        console.log(`Deleting docs and infodocs: ${ids}`);
      }
      const infoIds = ids.map(id => `${id}-info`);
      return Promise.all([
        module.exports
        .requestOnTestDb({
          path: '/_bulk_docs',
          method: 'POST',
          body: { docs: toDelete },
        })
        .then(response => {
          if (e2eDebug) {
            console.log(`Deleted docs: ${JSON.stringify(response)}`);
          }
        }),
        module.exports.sentinelDb.allDocs({keys: infoIds})
          .then(results => {
            const deletes = results.rows
              .filter(row => row.value) // Not already deleted
              .map(({id, value}) => ({
                _id: id,
                _rev: value.rev,
                _deleted: true
              }));

            return module.exports.sentinelDb.bulkDocs(deletes);
          }).then(response => {
          if (e2eDebug) {
            console.log(`Deleted sentinel docs: ${JSON.stringify(response)}`);
          }
        })
      ]);
    });
};

const refreshToGetNewSettings = () => {
  // wait for the updates to replicate
  const dialog = element(by.css('#update-available .submit:not(.disabled)'));
  return browser
    .wait(protractor.ExpectedConditions.elementToBeClickable(dialog), 10000)
    .then(() => {
      dialog.click();
    })
    .catch(() => {
      // sometimes there's a double update which causes the dialog to be redrawn
      // retry with the new dialog
      dialog.isPresent().then(function(result) {
        if (result) {
          dialog.click();
        }
      });
    })
    .then(() => {
      return browser.wait(
        protractor.ExpectedConditions.elementToBeClickable(
          element(by.id('contacts-tab'))
        ),
        10000
      );
    });
};

const setUserContactDoc = () => {
  const {
          DB_NAME: dbName,
          USER_CONTACT_ID: docId,
          DEFAULT_USER_CONTACT_DOC: defaultDoc
        } = constants;

  return module.exports.getDoc(docId)
    .catch(() => ({}))
    .then(existing => {
      const rev = _.pick(existing, '_rev');
      return _.extend(defaultDoc, rev);
    })
    .then(newDoc => request({
      path: `/${dbName}/${docId}`,
      body: newDoc,
      method: 'PUT',
    }));
};


const revertDb = (except, ignoreRefresh) => {
  return revertSettings().then(needsRefresh => {
    return deleteAll(except).then(() => {
      // only need to refresh if the settings were changed
      if (!ignoreRefresh && needsRefresh) {
        return refreshToGetNewSettings();
      }
    }).then(setUserContactDoc);
  });
};

const deleteUsers = async (users, meta = false) => {
  const usernames = users.map(user => `org.couchdb.user:${user.username}`);
  const userDocs = await request({ path: '/_users/_all_docs', method: 'POST', body: { keys: usernames } });
  const medicDocs = await request({ path: '/medic/_all_docs', method: 'POST', body: { keys: usernames } });
  const toDelete = userDocs.rows
    .map(row => row.value && ({ _id: row.id, _rev: row.value.rev, _deleted: true }))
    .filter(stub => stub);
  const toDeleteMedic = medicDocs.rows
    .map(row => row.value && ({ _id: row.id, _rev: row.value.rev, _deleted: true }))
    .filter(stub => stub);

  await Promise.all([
    request({ path: '/_users/_bulk_docs', method: 'POST', body: { docs: toDelete } }),
    request({ path: '/medic/_bulk_docs', method: 'POST', body: { docs: toDeleteMedic } }),
  ]);

  if (!meta) {
    return;
  }

  for (let user of users) {
    await request({ path: `/medic-user-${user.username}-meta`,  method: 'DELETE' });
  }
};

const createUsers = async (users, meta = false) => {
  const createUserOpts = {
    path: '/api/v1/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  for (let user of users) {
    await request(Object.assign({ body: user }, createUserOpts));
  }

  if (!meta) {
    return;
  }

  for (let user of users) {
    await request({ path: `/medic-user-${user.username}-meta`,  method: 'PUT' });
  }
};

const waitForDocRev = (ids) => {
  ids = ids.map(id => typeof id === 'string' ? { id: id, rev: 1 } : id );

  const validRow = row => {
    if (!row.id || !row.value || !row.value.rev) {
      return false;
    }

    const expectedRev = ids.find(id => id.id === row.id).rev;
    if (!expectedRev) {
      return false;
    }

    const existentRev = row.value.rev.split('-')[0];
    return Number(existentRev) >= Number(expectedRev);
  };

  const opts = {
    path: '/_all_docs',
    body: { keys: ids.map(id => id.id) },
    method: 'POST'
  };

  return module.exports.requestOnTestDb(opts).then(results => {
    if (results.rows.every(validRow)) {
      return;
    }
    return module.exports.delayPromise(() => waitForDocRev(ids), 100);
  });
};

module.exports = {
  db: db,
  sentinelDb: sentinel,

  request: request,

  reporter: new htmlScreenshotReporter({
    reportTitle: 'e2e Test Report',
    inlineImages: true,
    showConfiguration: true,
    captureOnlyFailedSpecs: true,
    reportOnlyFailedSpecs: false,
    showQuickLinks: true,
    dest: 'tests/results',
    filename: 'report.html',
    pathBuilder: function(currentSpec) {
      return currentSpec.fullName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
    },
  }),

  specReporter: new specReporter({
    spec: {
      displayStacktrace: true,
      displayDuration: true
    }
  }),

  requestOnTestDb: (options, debug) => {
    if (typeof options === 'string') {
      options = {
        path: options,
      };
    }

    const pathAndReqType = `${options.path}${options.method}`;
    if (pathAndReqType !== '/GET') {
      options.path = '/' + constants.DB_NAME + (options.path || '');
    }
    return request(options, { debug });
  },

  requestOnTestMetaDb: (options, debug) => {
    if (typeof options === 'string') {
      options = {
        path: options,
      };
    }
    options.path = `/medic-user-${options.userName}-meta${options.path || ''}`;
    return request(options, { debug: debug });
  },

  requestOnMedicDb: (options, debug ) => {
    if (typeof options === 'string') {
      options = { path: options };
    }
    options.path = `/medic${options.path || ''}`;
    return request(options, { debug: debug });
  },

  saveDoc: doc => {
    return module.exports.requestOnTestDb({
      path: '/', // so audit picks this up
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': JSON.stringify(doc).length,
      },
      body: doc,
    });
  },

  saveDocs: docs =>
    module.exports
      .requestOnTestDb({
        path: '/_bulk_docs',
        method: 'POST',
        body: { docs: docs }
      })
      .then(results => {
        if (results.find(r => !r.ok)) {
          throw Error(JSON.stringify(results, null, 2));
        } else {
          return results;
        }
      }),

  getDoc: id => {
    return module.exports.requestOnTestDb({
      path: `/${id}`,
      method: 'GET',
    });
  },

  getDocs: ids => {
    return module.exports
      .requestOnTestDb({
        path: `/_all_docs?include_docs=true`,
        method: 'POST',
        body: { keys: ids || []},
        headers: { 'content-type': 'application/json' },
      })
      .then(response => response.rows.map(row => row.doc));
  },

  deleteDoc: id => {
    return module.exports.getDoc(id).then(doc => {
      doc._deleted = true;
      return module.exports.saveDoc(doc);
    });
  },

  deleteDocs: ids => {
    return module.exports.getDocs(ids).then(docs => {
      docs.forEach(doc => doc._deleted = true);
      return module.exports.requestOnTestDb({
        path: '/_bulk_docs',
        method: 'POST',
        body: { docs },
      });
    });
  },

  /**
   * Deletes all docs in the database, except some core docs (read the code) and
   * any docs that you specify.
   *
   * NB: this is back-end only, it does *not* care about the front-end, and will
   * not detect if it needs to refresh
   *
   * @param      {Array}    except  array of: exact document name; or regex; or
   *                                predicate function that returns true if you
   *                                wish to keep the document
   * @return     {Promise}  completion promise
   */
  deleteAllDocs: deleteAll,

  /*
   * Sets the document referenced by the user's org.couchdb.user document to a default value
   */
  setUserContactDoc,

  /**
   * Update settings and refresh if required
   *
   * @param      {Object}   updates  Object containing all updates you wish to
   *                                 make
   * @param      {Boolean}  ignoreRefresh  don't bother refreshing
   * @return     {Promise}  completion promise
   */
  updateSettings: (updates, ignoreRefresh = false) =>
    updateSettings(updates).then(() => {
      if (!ignoreRefresh) {
        return refreshToGetNewSettings();
      }
    }),

  /**
   * Revert settings and refresh if required
   *
   * @param      {Boolean}  ignoreRefresh  don't bother refreshing
   * @return     {Promise}  completion promise
   */
  revertSettings: ignoreRefresh =>
    revertSettings().then(() => {
      if (!ignoreRefresh) {
        return refreshToGetNewSettings();
      }
    }),

  seedTestData: (done, userContactDoc, documents) => {
    protractor.promise
      .all(documents.map(module.exports.saveDoc))
      .then(() => module.exports.getDoc(constants.USER_CONTACT_ID))
      .then(existingContactDoc => {
        if (userContactDoc) {
          _.extend(existingContactDoc, userContactDoc);
          return module.exports.saveDoc(existingContactDoc);
        }
      })
      .then(done)
      .catch(done.fail);
  },

  /**
   * Cleans up DB after each test. Works with the given callback
   * and also returns a promise - pick one!
   */
  afterEach: done => {
    return revertDb()
      .then(() => {
        if (done) {
          done();
        }
      })
      .catch(err => {
        if (done) {
          done.fail(err);
        } else {
          throw err;
        }
      });
  },

  //check for the update modal before
  beforeEach: () => {
    if (element(by.css('#update-available')).isPresent()) {
      $('body').sendKeys(protractor.Key.ENTER);
    }
  },

  /**
   * Reverts the db's settings and documents
   *
   * @param      {Array}  except         documents to ignore, see deleteAllDocs
   * @param      {Boolean}  ignoreRefresh  don't bother refreshing
   * @return     {Promise}  promise
   */
  revertDb: revertDb,

  resetBrowser: () => {
    browser.driver
      .navigate()
      .refresh()
      .then(() => {
        return browser.wait(() => {
          return element(by.css('#messages-tab')).isPresent();
        }, 10000);
      });
  },

  countOf: count => {
    return c => {
      return c === count;
    };
  },

  getCouchUrl: () =>
    `http://${auth.username}:${auth.password}@${constants.COUCH_HOST}:${
      constants.COUCH_PORT
    }/${constants.DB_NAME}`,

  getOrigin: () =>
    `http://${constants.API_HOST}:${constants.API_PORT}`,

  getBaseUrl: () =>
    `http://${constants.API_HOST}:${constants.API_PORT}/#/`,

  getAdminBaseUrl: () =>
    `http://${constants.API_HOST}:${constants.API_PORT}/admin/#/`,

  getLoginUrl: () =>
    `http://${constants.API_HOST}:${constants.API_PORT}/${
      constants.DB_NAME
    }/login`,

  // Deletes _users docs and medic/user-settings docs for specified users
  // @param {Array} usernames - list of users to be deleted
  // @param {Boolean} meta - if true, deletes meta db-s as well, default true
  // @return {Promise}
  deleteUsers: deleteUsers,

  // Creates users - optionally also creating their meta dbs
  // @param {Array} users - list of users to be created
  // @param {Boolean} meta - if true, creates meta db-s as well, default false
  // @return {Promise}
  createUsers: createUsers,

  setDebug: debug => e2eDebug = debug,

  stopSentinel: () => {
    if (process.env.TRAVIS) {
      return new Promise(res => {
        const pid = spawn('horti-svc-stop', ['medic-sentinel']);

        pid.on('exit', res);
      });
    } else {
      return rpn.post('http://localhost:31337/sentinel/stop');
    }
  },
  startSentinel: () => {
    if (process.env.TRAVIS) {
      return new Promise(res => {
        const pid = spawn('horti-svc-start', [`${require('os').homedir()}/.horticulturalist/deployments`, 'medic-sentinel']);

        pid.on('exit', res);
      });
    } else {
      return rpn.post('http://localhost:31337/sentinel/start');
    }
  },

  // delays executing a function that returns a promise with the provided interval (in ms)
  delayPromise: (promiseFn, interval) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => promiseFn().then(resolve).catch(reject), interval);
    });
  },

  setProcessedSeqToNow: () => {
    return Promise.all([
      sentinel.get('_local/sentinel-meta-data'),
      db.info()
    ]).then(([sentinelMetadata, {update_seq: updateSeq}]) => {
      sentinelMetadata.processed_seq = updateSeq;
      return sentinel.put(sentinelMetadata);
    });
  },
  refreshToGetNewSettings: refreshToGetNewSettings,

  waitForDocRev: waitForDocRev,
};
