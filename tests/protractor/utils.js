const _ = require('underscore'),
      auth = require('./auth')(),
      constants = require('./constants'),
      http = require('http'),
      path = require('path'),
      htmlScreenshotReporter = require('protractor-jasmine2-screenshot-reporter'),
  // The app_settings and update_settings modules are on the main ddoc.
      mainDdocName = 'medic',
      userSettingsDocId = `org.couchdb.user:${auth.user}`;

let originalSettings;

const request = (options, debug) => {
  const deferred = protractor.promise.defer();

  options.hostname = constants.API_HOST;
  options.port = constants.API_PORT;
  options.auth = auth.user + ':' + auth.pass;

  if (debug) {
    console.log('REQUEST');
    console.log(JSON.stringify(options));
  }

  const req = http.request(options, res => {
    res.setEncoding('utf8');
    let body = '';
    res.on('data', chunk => {
      body += chunk;
    });
    res.on('end', () => {
      try {
        body = JSON.parse(body);
        if (body.error) {
          deferred.reject(new Error(`Request failed: ${options.path},\n  body: ${JSON.stringify(options.body)}\n  response: ${JSON.stringify(body)}`));
        } else {
          deferred.fulfill(body);
        }
      } catch (e) {
        console.log('Error parsing response: ' + body);
        deferred.reject();
      }
    });
  });
  req.on('error', e => {
    console.log('Request failed: ' + e.message);
    deferred.reject();
  });

  if (options.body) {
    req.write(options.body);
  }
  req.end();

  return deferred.promise;
};

const updateSettings = updates => {
  if (originalSettings) {
    throw new Error('A previous test did not call revertSettings');
  }
  return request({
    path: path.join('/', constants.DB_NAME, '_design', mainDdocName, '_rewrite/app_settings', mainDdocName),
    method: 'GET'
  }).then(result => {
    originalSettings = result.settings;

    // Make sure all updated fields are present in originalSettings, to enable reverting later.
    Object.keys(updates).forEach(updatedField => {
      if (!_.has(originalSettings, updatedField)) {
        originalSettings[updatedField] = null;
      }
    });
    return;
  }).then(() => {
    return request({
      path: path.join('/', constants.DB_NAME, '_design', mainDdocName, '_rewrite/update_settings', mainDdocName, '?replace=1'),
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  });
};

const revertSettings = () => {
  if (!originalSettings) {
    return Promise.resolve(false);
  }

  console.log(`Reverting settings`);

  return request({
    path: path.join('/', constants.DB_NAME, '_design', mainDdocName, '_rewrite/update_settings', mainDdocName, '?replace=1'),
    method: 'PUT',
    body: JSON.stringify(originalSettings)
  }).then(() => {
    originalSettings = null;
    return true;
  });
};

const deleteAll = () => {
  const typesToIgnore = ['translations', 'translations-backup', 'user-settings', 'info'];
  const idsToIgnore = ['appcache', 'migration-log', 'resources', '_local/sentinel-meta-data'];
  return request({
    path: path.join('/', constants.DB_NAME, '_all_docs?include_docs=true'),
    method: 'GET'
  })
    .then(response => {
      return response.rows.filter(row => {
        return !row.id.startsWith('_design/') &&
          !idsToIgnore.includes(row.id) &&
          !typesToIgnore.includes(row.doc.type);
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

const refreshToGetNewSettings = () => { //no change. Just testing 6
  // wait for the updates to replicate
  const dialog = element(by.css('#update-available .submit:not(.disabled)'));
  return browser.wait(protractor.ExpectedConditions.elementToBeClickable(dialog), 10000)
    .then(() => {
      dialog.click();
    })
    .catch(() => {
      // sometimes there's a double update which causes the dialog to be redrawn
      // retry with the new dialog
      if (dialog.isDisplayed()) {
        dialog.click();
      }
    })
    .then(() => {
      return browser.wait(protractor.ExpectedConditions.elementToBeClickable(element(by.id('contacts-tab'))), 10000);
    });
};

const revertDb = () => {
  return revertSettings().then(needsRefresh => {
    return deleteAll().then(() => {
      // only need to refresh if the settings were changed
      if (needsRefresh) {
        return refreshToGetNewSettings();
      }
    });
  });
};

module.exports = {

  request: request,
  
  saveLogs: () => {
    browser.manage().logs()
      .get('browser').then(function(browserLog) {
        console.log('log: ' +
          require('util').inspect(browserLog));
      });
  },

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
      return currentSpec.fullName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
    }
  }),

  requestOnTestDb: (options, debug) => {
    options.path = '/' + constants.DB_NAME + options.path;
    return request(options, debug);
  },

  saveDoc: doc => {
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

  getDoc: id => {
    return request({
      path: `/${constants.DB_NAME}/${id}`,
      method: 'GET'
    });
  },

  getAuditDoc: id => {
    return request({
      path: `/${constants.DB_NAME}-audit/${id}-audit`,
      method: 'GET'
    });
  },

  deleteDoc: id => {
    return module.exports.getDoc(id)
      .then(doc => {
        doc._deleted = true;
        return module.exports.saveDoc(doc);
      });
  },

  updateSettings: updates => {
    // Update both ddocs, to avoid instability in tests.
    // Note that API will be copying changes to medic over to medic-client, so change
    // medic-client first (api does nothing) and medic after (api copies changes over to
    // medic-client, but the changes are already there.)
    return updateSettings(updates)
      .then(refreshToGetNewSettings);
  },

  seedTestData: (done, contactId, documents) => {
    protractor.promise
      .all(documents.map(module.exports.saveDoc))
      .then(() => module.exports.getDoc(userSettingsDocId))
      .then((user) => {
        user.contact_id = contactId;
        return module.exports.saveDoc(user);
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

  resetBrowser: () => {
    browser.driver.navigate().refresh().then(() => {
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
    `http://${auth.user}:${auth.pass}@${constants.COUCH_HOST}:${constants.COUCH_PORT}/${constants.DB_NAME}`,

  getBaseUrl: () =>
    `http://${constants.API_HOST}:${constants.API_PORT}/${constants.DB_NAME}`,

  getLoginUrl: () =>
    `http://${constants.API_HOST}:${constants.API_PORT}/${constants.DB_NAME}/login`
};
