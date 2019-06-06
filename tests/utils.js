const _ = require('underscore'),
  auth = require('./auth')(),
  constants = require('./constants'),
  http = require('http'),
  path = require('path'),
  htmlScreenshotReporter = require('protractor-jasmine2-screenshot-reporter');
const specReporter = require('jasmine-spec-reporter').SpecReporter;

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));
const db = new PouchDB(
  `http://${auth.user}:${auth.pass}@${constants.COUCH_HOST}:${
    constants.COUCH_PORT
  }/${constants.DB_NAME}`
);

let originalSettings;
let e2eDebug;

// First Object is passed to http.request, second is for specific options / flags
// for this wrapper
const request = (options, { debug, noAuth, notJson } = {}) => {
  if (typeof options === 'string') {
    options = {
      path: options,
    };
  }

  const deferred = protractor.promise.defer();

  options.hostname = constants.API_HOST;
  options.port = constants.API_PORT;
  if (!noAuth) {
    options.auth = options.auth || auth.user + ':' + auth.pass;
  }

  if (debug) {
    console.log('!!!!!!!REQUEST!!!!!!!');
    console.log('!!!!!!!REQUEST!!!!!!!');
    console.log(JSON.stringify(options));
    console.log('!!!!!!!REQUEST!!!!!!!');
    console.log('!!!!!!!REQUEST!!!!!!!');
  }

  const req = http.request(options, res => {
    res.setEncoding('utf8');
    let body = '';
    res.on('data', chunk => {
      body += chunk;
    });
    res.on('end', () => {
      try {
        if (notJson) {
          return deferred.fulfill(body);
        }

        body = JSON.parse(body);
        if (body.error) {
          const err = new Error(
            `Request failed: ${options.path},\n  body: ${JSON.stringify(
              options.body
            )}\n  response: ${JSON.stringify(body)}`
          );
          err.responseBody = body;
          err.statusCode = res.statusCode;
          deferred.reject(err);
        } else {
          deferred.fulfill(body);
        }
      } catch (e) {
        let errorMessage = `Server returned an error for request: ${JSON.stringify(
          options
        )}\n  `;

        if (body === 'Server error') {
          errorMessage += 'Check medic-api logs for details.';
        } else {
          errorMessage += `Response status: ${res.statusCode}, body: ${body}`;
        }

        const err = new Error(errorMessage);
        err.responseBody = body;
        deferred.reject(err);
      }
    });
  });
  req.on('error', e => {
    console.log('Request failed: ' + e.message);
    deferred.reject(e);
  });

  if (options.body) {
    if (typeof options.body === 'string') {
      req.write(options.body);
    } else {
      req.write(JSON.stringify(options.body));
    }
  }

  req.end();

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
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' },
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
    body: JSON.stringify(originalSettings),
    headers: { 'Content-Type': 'application/json' },
  }).then(() => {
    originalSettings = null;
    return true;
  });
};

const deleteAll = (except = []) => {
  // Generate a list of functions to filter documents over
  const ignorables = except.concat(
    doc =>
      ['translations', 'translations-backup', 'user-settings', 'info'].includes(
        doc.type
      ),
    'service-worker-meta',
    constants.USER_CONTACT_ID,
    'migration-log',
    'resources',
    'branding',
    'partners',
    'settings',
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
    .request({
      path: path.join('/', constants.DB_NAME, '_all_docs?include_docs=true'),
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
        console.log(`Deleting docs: ${ids}`);
      }
      return module.exports
        .request({
          path: path.join('/', constants.DB_NAME, '_bulk_docs'),
          method: 'POST',
          body: JSON.stringify({ docs: toDelete }),
          headers: { 'content-type': 'application/json' },
        })
        .then(response => {
          if (e2eDebug) {
            console.log(`Deleted docs: ${JSON.stringify(response)}`);
          }
        });
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
      body: JSON.stringify(newDoc),
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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

const deleteUsers = usernames => {
  const userIds = JSON.stringify(
      usernames.map(user => `org.couchdb.user:${user}`)
    ),
    method = 'POST',
    headers = { 'Content-Type': 'application/json' };

  return Promise.all([
    request(
      `/${constants.DB_NAME}/_all_docs?include_docs=true&keys=${userIds}`
    ),
    request(`/_users/_all_docs?include_docs=true&keys=${userIds}`),
  ]).then(results => {
    const docs = results.map(result =>
      result.rows
        .map(row => {
          if (row.doc) {
            row.doc._deleted = true;
            row.doc.type = 'tombstone';
            return row.doc;
          }
        })
        .filter(doc => doc)
    );

    return Promise.all([
      request({
        path: `/${constants.DB_NAME}/_bulk_docs`,
        body: { docs: docs[0] },
        method,
        headers,
      }),
      request({
        path: `/_users/_bulk_docs`,
        body: { docs: docs[1] },
        method,
        headers,
      }),
    ]);
  });
};

module.exports = {
  db: db,

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

  requestOnTestDb: (options, debug, notJson) => {
    if (typeof options === 'string') {
      options = {
        path: options,
      };
    }

    const pathAndReqType = `${options.path}${options.method}`;
    if (pathAndReqType !== '/GET') {
      options.path = '/' + constants.DB_NAME + (options.path || '');
    }
    return request(options, { debug: debug, notJson: notJson });
  },

  requestOnMedicDb: (options, debug, notJson) => {
    if (typeof options === 'string') {
      options = { path: options };
    }
    options.path = `/medic${options.path || ''}`;
    return request(options, { debug: debug, notJson: notJson });
  },

  saveDoc: doc => {
    const postData = JSON.stringify(doc);
    return module.exports.requestOnTestDb({
      path: '/', // so audit picks this up
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
      },
      body: postData,
    });
  },

  saveDocs: docs =>
    module.exports
      .requestOnTestDb({
        path: '/_bulk_docs',
        method: 'POST',
        body: { docs: docs },
        headers: { 'content-type': 'application/json' },
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
        headers: { 'content-type': 'application/json' },
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
  updateSettings: (updates, ignoreRefresh) =>
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
    `http://${auth.user}:${auth.pass}@${constants.COUCH_HOST}:${
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
  // @return {Promise}
  deleteUsers: deleteUsers,

  setDebug: debug => e2eDebug = debug
};
