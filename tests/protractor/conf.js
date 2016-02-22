var auth = require('./auth');

exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: [ 'e2e/**/*.js' ],
  framework: 'jasmine2',
  capabilities: {
    // browserName: 'chromium-browser'
    browserName: 'firefox'
  },
  onPrepare: function() {
    var credentials = auth.getAuth();

    browser.driver.get(
      'http://localhost:5988/medic-test/login?redirect=' +
      encodeURIComponent('/medic-test/_design/medic/_rewrite/#/messages?e2eTesting=true')
    );
    browser.driver.findElement(by.name('user')).sendKeys(credentials.user);
    browser.driver.findElement(by.name('password')).sendKeys(credentials.pass);
    browser.driver.findElement(by.id('login')).click();

    // Login takes some time, so wait until it's done.
    browser.driver.sleep(10000);
    return browser.driver.wait(function() {
      return browser.driver.getCurrentUrl().then(function(url) {
        return /_design/.test(url);
      });
    }, 10000);
  }
};