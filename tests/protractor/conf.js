var _ = require('underscore'),
    utils = require('./utils'),
    spawn = require('child_process').spawn,
    environment = require('./auth')(),
    api;

_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

var login = function(browser) {
  var loginUrlTemplate = _.template('http://{{apiHost}}:{{apiPort}}/{{dbName}}/login?redirect=');
  var redirectUrl = encodeURIComponent('/' + environment.dbName  + '/_design/medic/_rewrite/#/messages?e2eTesting=true');
  browser.driver.get(loginUrlTemplate(environment) + redirectUrl);
  browser.driver.findElement(by.name('user')).sendKeys(environment.user);
  browser.driver.findElement(by.name('password')).sendKeys(environment.pass);
  browser.driver.findElement(by.id('login')).click();
  // Login takes some time, so wait until it's done.
  return browser.driver.wait(function() {
    return browser.driver.isElementPresent(by.css('body.bootstrapped'));
  }, 20 * 1000, 'Login should be complete within 20 seconds');
};

var startApi = function() {
  return new Promise(function(resolve) {
    var couchUrlTemplate = _.template('http://{{user}}:{{pass}}@{{couchHost}}:{{couchPort}}/{{dbName}}');
    api = spawn('node', ['server.js'], {
      cwd: 'api',
      env: {
        API_PORT: environment.apiPort,
        COUCH_URL: couchUrlTemplate(environment),
        COUCH_NODE_NAME: process.env.COUCH_NODE_NAME,
        PATH: process.env.PATH
      }
    });
    api.stdout.on('data', function(data) {
      if (data.toString().indexOf('Medic API listening on port') >= 0) {
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
    path: '/' + environment.dbName  + '/_design/medic/_rewrite/update_settings/medic',
    method: 'PUT',
    body: JSON.stringify({ setup_complete: true })
  });
};

var setupUser = function() {
  return utils.getDoc('org.couchdb.user:' + environment.user)
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
    // browserName: 'chrome'
    browserName: 'firefox'
  },
  onPrepare: function() {
    var started = startApi();
    browser.driver.wait(started, 15 * 1000, 'Server should start within 15 seconds');
    browser.driver.sleep(1000);
    browser.driver.wait(setupSettings, 5 * 1000, 'Settings should be setup within 5 seconds');
    browser.driver.wait(setupUser, 5 * 1000, 'User should be setup within 5 seconds');
    browser.driver.sleep(1000);
    return login(browser);
  },
  onCleanUp: function() {
    api.kill();
  }
};
