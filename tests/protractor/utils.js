const _ = require('underscore'),
  auth = require('./auth')(),
  constants = require('./constants'),
  http = require('http'),
  path = require('path');

const originalSettings = {};

// The app_settings and update_settings modules are on the main ddoc.
const mainDdocName = 'medic';
const userSettingsDocId = `org.couchdb.user:${auth.user}`;

const request = (options, debug) =>  {
  const deferred = protractor.promise.defer();

  options.hostname = constants.API_HOST;
  options.port = constants.API_PORT;
  options.auth = auth.user + ':' + auth.pass;

  if (debug) {
    console.log('REQUEST');
    console.log(JSON.stringify(options));
  }

  const req = http.request(options, res =>  {
    res.setEncoding('utf8');
    let body = '';
    res.on('data', chunk =>  {
      body += chunk;
    });
    res.on('end', () =>  {
      try {
        body = JSON.parse(body);
        if (body.error) {
          deferred.reject(new Error('Request failed: ' + options.path + ',\n  body: ' + JSON.stringify(options.body) + '\n  response: ' + JSON.stringify(body)));
        } else {
          deferred.fulfill(body);
        }
      } catch (e) {
        console.log('Error parsing response: ' + body);
        deferred.reject();
      }
    });
  });
  req.on('error', e =>  {
    console.log('Request failed: ' + e.message);
    deferred.reject();
  });

  if (options.body) {
    req.write(options.body);
  }
  req.end();

  return deferred.promise;
};

const updateSettingsForDdoc = (updates, ddocName) =>  {
  if (originalSettings[ddocName]) {
    throw new Error('A previous test did not call revertSettings on ' + ddocName);
  }
  return request({
    path: path.join('/', constants.DB_NAME, '_design', mainDdocName, '_rewrite/app_settings', ddocName),
    method: 'GET'
  }).then(result =>  {
    originalSettings[ddocName] = result.settings;

    // Make sure all updated fields are present in originalSettings[ddocName], to enable reverting later.
    Object.keys(updates).forEach(updatedField =>  {
      if (!_.has(originalSettings[ddocName], updatedField)) {
        originalSettings[ddocName][updatedField] = null;
      }
    });
    return;
  }).then(() =>  {
    return request({
      path: path.join('/', constants.DB_NAME, '_design', mainDdocName, '_rewrite/update_settings', ddocName, '?replace=1'),
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  });
};

const revertSettingsForDdoc = ddocName =>  {
  if (!originalSettings[ddocName]) {
    return Promise.resolve();
  }

  console.log(`Reverting settings for ${ddocName}`);

  return request({
    path: path.join('/', constants.DB_NAME, '_design', mainDdocName, '_rewrite/update_settings', ddocName, '?replace=1'),
    method: 'PUT',
    body: JSON.stringify(originalSettings[ddocName])
  }).then(() =>  {
    delete originalSettings[ddocName];
  });
};

const deleteAll = () => {
  const typesToIgnore = ['translations', 'translations-backup', 'user-settings'];
  const idsToIgnore = ['appcache', 'migration-log', 'resources', 'sentinel-meta-data'];
  return request({
    path: path.join('/', constants.DB_NAME, '_all_docs?include_docs=true'),
    method: 'GET'
  })
    .then(response => {
      return response.rows.filter(row => {
        return row.id.indexOf('_design/') !== 0 &&
          idsToIgnore.indexOf(row.id) === -1 &&
          typesToIgnore.indexOf(row.doc.type) === -1;
      }).map(row => {
        row.doc._deleted = true;
        return row.doc;
      });
    })
    .then(toDelete => {
      const ids = toDelete.map(doc => doc._id);
      console.log(`Deleting docs: ${ids}`);
      return request({
        path: path.join('/', constants.DB_NAME, '_bulk_docs'),
        method: 'POST',
        body: JSON.stringify({ docs: toDelete }),
        headers: { 'content-type': 'application/json' }
      }).then(response => {
        console.log(`Deleted docs: ${JSON.stringify(response)}`);
      });
    });
};

module.exports = {

  request: request,

  requestOnTestDb: (options, debug) =>  {
    options.path = '/' + constants.DB_NAME + options.path;
    return request(options, debug);
  },

  saveDoc: doc =>  {
    const postData = JSON.stringify(doc);
    return request({
      path: '/' + constants.DB_NAME,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      },
      body: postData
    });
  },

  getDoc: id =>  {
    return request({
      path: '/' + constants.DB_NAME + '/' + id,
      method: 'GET'
    });
  },

  getAuditDoc: id =>  {
    return request({
      path: '/' + constants.DB_NAME + '-audit/' + id + '-audit',
      method: 'GET'
    });
  },

  deleteDoc: id =>  {
    return module.exports.getDoc(id)
      .then(doc =>  {
        doc._deleted = true;
        return module.exports.saveDoc(doc);
      });
  },

  updateSettings: updates =>  {
    // Update both ddocs, to avoid instability in tests.
    // Note that API will be copying changes to medic over to medic-client, so change
    // medic-client first (api does nothing) and medic after (api copies changes over to
    // medic-client, but the changes are already there.)
    return updateSettingsForDdoc(updates, 'medic-client')
      .then(() =>  {
        return updateSettingsForDdoc(updates, 'medic');
      });
  },

  revertSettings: () =>  {
    return revertSettingsForDdoc('medic-client')
      .then(() =>  {
        return revertSettingsForDdoc('medic');
      });
  },

  seedTestData: (done, contactId, documents) => {
    browser.ignoreSynchronization = true;
    protractor.promise
      .all(documents.map(module.exports.saveDoc))
      .then(() => module.exports.getDoc(userSettingsDocId))
      .then((user) => {
        user.contact_id = contactId;
        return module.exports.saveDoc(user);
      })
      .then(done)
      .catch(done);
  },

  /**
   * Cleans up DB after each test. Works with the given callback
   * and also returns a promise - pick one!
   */
  afterEach: done => {
    return module.exports.revertSettings()
      .then(deleteAll)
      .then(() => {
        if (done) {
          done();
        }
      })
      .catch(err => {
        if (done) {
          done(err);
        } else {
          console.error('Error deleting all docs');
          throw err;
        }
      });
  },

  resetBrowser: () =>  {
    browser.driver.navigate().refresh().then(() =>  {
      return browser.wait(() =>  {
        return element(by.css('#messages-tab')).isPresent();
      }, 10000);
    });
  },

  countOf: count =>  {
    return c =>  {
      return c === count;
    };
  },

  getCouchUrl: () =>
    `http://${auth.user}:${auth.pass}@${constants.COUCH_HOST}:${constants.COUCH_PORT}/${constants.DB_NAME}`,

  getBaseUrl: () =>
    `http://${constants.API_HOST}:${constants.API_PORT}/${constants.DB_NAME}`,

  getLoginUrl: () =>
    `http://${constants.API_HOST}:${constants.API_PORT}/${constants.DB_NAME}/login`
};
