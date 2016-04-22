var auth = require('./auth'),
    utils = require('./utils'),
    spawn = require('child_process').spawn,
    credentials = auth.getAuth(),
    api;

var login = function(browser) {
  browser.driver.get(
    'http://localhost:5998/medic-test/login?redirect=' +
    encodeURIComponent('/medic-test/_design/medic/_rewrite/#/messages?e2eTesting=true')
  );
  browser.driver.findElement(by.name('user')).sendKeys(credentials.user);
  browser.driver.findElement(by.name('password')).sendKeys(credentials.pass);
  browser.driver.findElement(by.id('login')).click();

  // Login takes some time, so wait until it's done.
  browser.driver.sleep(10000);
  return browser.driver.getCurrentUrl().then(function(url) {
    return /_design/.test(url);
  });
};

var startApi = function() {
  return new Promise(function(resolve) {
    api = spawn('node', ['server.js'], {
      cwd: 'api',
      env: {
        API_PORT: 5998,
        COUCH_URL: 'http://' + credentials.user + ':' + credentials.pass + '@localhost:5984/medic-test'
      }
    });
    api.stdout.on('data', function(data) {
      if (data.toString() === 'Database migrations completed successfully\n') {
        resolve();
      }
      console.log('[api] ' + data);
    });
    api.stderr.on('data', function(data) {
      console.error('[api] ' + data);
    });
  });
};

var setupSettings = function() {
  return utils.request({
    path: '/medic-test/_design/medic/_rewrite/update_settings/medic',
    method: 'PUT',
    body: JSON.stringify({ setup_complete: true })
  });
};

var setupUser = function() {
  return utils.getDoc('org.couchdb.user:' + credentials.user)
    .then(function(doc) {
      doc.known = true;
      doc.language = 'en';
      doc.roles = ['_admin'];
      return utils.saveDoc(doc);
    });
};

exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: [ 'e2e/**/*.js' ],
  framework: 'jasmine2',
  capabilities: {
    browserName: 'chrome'
    // browserName: 'firefox'
  },
  onPrepare: function() {
    var started = startApi();
    browser.driver.wait(started, 10 * 1000, 'Server should start within 10 seconds');
    browser.driver.sleep(1000);
    browser.driver.wait(setupSettings, 5 * 1000, 'Settings should be setup within 5 seconds');
    browser.driver.wait(setupUser, 5 * 1000, 'User should be setup within 5 seconds');
    browser.driver.sleep(1000);
    return browser.driver.wait(function() {
      return login(browser);
    }, 10 * 1000, 'Login should be complete within 10 seconds');
  },
  onCleanUp: function() {
    api.kill();
  }
};