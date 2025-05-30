const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const { startOidcServer, stopOidcServer, getDiscoveryUrl, EMAIL } = require('@utils/mock-oidc-provider');
const constants = require('@constants');

describe('SSO Login', () => {
  const user = {
    username: 'testusername',
    roles: ['program_officer'],
    phone: '+40766565656',
    oidc_username: EMAIL
  };

  const setupSsoLogin = async () => {
    const settings = {
      oidc_provider: {
        discovery_url: getDiscoveryUrl(),
        client_id: 'cht',
        allow_insecure_requests: true
      },
      app_url: constants.BASE_URL
    };
    await utils.updateSettings(settings, { ignoreReload: true });
    await utils.saveCredentials('oidc:client-secret', 'client-secret');
  };

  beforeEach(async () => {
    await startOidcServer();
    await setupSsoLogin();
    await browser.refresh();
  });

  afterEach(async () => {
    await utils.deleteUsers([user]);
    await utils.revertSettings(true);
    await stopOidcServer();
  });

  it('should log in the sso user', async () => {
    await utils.createUsers([user]);
    await loginPage.ssoLogin();
    await commonPage.tabsSelector.messagesTab().waitForDisplayed();
  });
});
