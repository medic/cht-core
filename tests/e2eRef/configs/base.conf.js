global.framework = require('../framework/testingFramework');

class BaseConfig {
    constructor(testSrcDir, options = {}) {
        this.config = {
            seleniumAddress: 'http://localhost:4444/wd/hub',
            specs: [`${testSrcDir}/specs/**/*.js`],
            framework: 'jasmine2',
            capabilities: {
                browserName: 'chrome',
                chromeOptions: {
                    args: ['--headless', '--disable-gpu', '--window-size=1024,768']
                }
            },

            beforeLaunch: function () {
                process.on('uncaughtException', function () {
                    framework.utils.reporter.jasmineDone();
                    framework.utils.reporter.afterLaunch();
                });
                return new Promise(function (resolve) {
                    framework.utils.reporter.beforeLaunch(resolve);
                });
            },

            onPrepare: () => {
                jasmine.getEnv().addReporter(framework.utils.reporter);
                browser.waitForAngularEnabled(false);
                if (options.manageServices) {
                    browser.driver.wait(framework.serviceManager.startAll(), 60 * 1000, 'API and Sentinel should start within 60 seconds');
                    browser.driver.sleep(1); // block until previous command has completed
                }
                browser.driver.wait(setupSettings, 5 * 1000, 'Settings should be setup within 5 seconds');
                browser.driver.wait(setupUser, 5 * 1000, 'User should be setup within 5 seconds');
                browser.driver.sleep(1); // block until previous command has completed
                return login(browser);
            },
        };
        if (options.manageServices) {
            this.onCleanUp = framework.serviceManager.stopAll;
        }
    }
}
module.exports = BaseConfig;


const getLoginUrl = () => {
    const redirectUrl = encodeURIComponent(`/${framework.constants.DB_NAME}/_design/${framework.constants.MAIN_DDOC_NAME}/_rewrite/#/messages`);
    return `http://${framework.constants.API_HOST}:${framework.constants.API_PORT}/${framework.constants.DB_NAME}/login?redirect=${redirectUrl}`;
};

const login = browser => {
    browser.driver.get(getLoginUrl());
    browser.driver.findElement(by.name('user')).sendKeys(framework.auth.user);
    browser.driver.findElement(by.name('password')).sendKeys(framework.auth.pass);
    browser.driver.findElement(by.id('login')).click();
    // Login takes some time, so wait until it's done.
    const bootstrappedCheck = () => element(by.css('body.bootstrapped')).isPresent();
    return browser.driver.wait(bootstrappedCheck, 20 * 1000, 'Login should be complete within 20 seconds');
};

const setupSettings = () => {
    return framework.utils.request({
        path: '/api/v1/settings',
        method: 'PUT',
        body: JSON.stringify({setup_complete: true}),
        headers: {'Content-Type': 'application/json'}
    });
};

const setupUser = () => {
    return framework.utils.getDoc('org.couchdb.user:' + framework.auth.user)
        .then(doc => {
            doc.known = true;
            doc.language = 'en';
            doc.roles = ['_admin'];
            return framework.utils.saveDoc(doc);
        });
};