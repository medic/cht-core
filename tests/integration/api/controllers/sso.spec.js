const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const utils = require('@utils');
const { startOidcServer, stopOidcServer, getOidcBaseUrl } = require('../../../utils/mock-oidc-provider');

let user;
const password = 'passwordSUP3RS3CR37!';
const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
};

const randomIp = () => {
  const section = () => (Math.floor(Math.random() * 255) + 1);
  return `${section()}.${section()}.${section()}.${section()}`;
};


const loginWithData = data => {
  const opts = {
    path: '/medic/login?aaa=aaa',
    method: 'POST',
    resolveWithFullResponse: true,
    noAuth: true,
    body: data,
    redirect: 'manual',
    headers: { 'X-Forwarded-For': randomIp() },
  };
  return utils.request(opts);
};

const loginWithTokenLink = (token = '') => {
  const opts = {
    path: `/medic/login/token/${token}`,
    method: 'POST',
    resolveWithFullResponse: true,
    noAuth: true,
    redirect: 'manual',
    body: {},
    headers: { 'X-Forwarded-For': randomIp() },
  };
  return utils.request(opts);
};

const expectLoginToWork = (response) => {
  chai.expect(response).to.include({ status: 302 });
  chai.expect(response.headers.getSetCookie()).to.be.an('array');
  chai.expect(response.headers.getSetCookie().find(cookie => cookie.startsWith('AuthSession'))).to.be.ok;
  chai.expect(response.headers.getSetCookie().find(cookie => cookie.startsWith('userCtx'))).to.be.ok;
  chai.expect(response.body).to.equal('/');
};

const expectRedirectToPasswordReset = (response) => {
  chai.expect(response).to.include({ status: 302 });
  chai.expect(response.headers.getSetCookie()).to.be.an('array');
  chai.expect(response.headers.getSetCookie().find(cookie => cookie.startsWith('userCtx'))).to.be.ok;
  chai.expect(response.body).to.equal('/medic/password-reset');
};

const expectLoginToFail = (response) => {
  chai.expect(response.headers.getSetCookie()).to.deep.equal([]);
  chai.expect(response.status).to.equal(401);
};

const getUser = (user) => {
  const getUserId = n => `org.couchdb.user:${n}`;
  const opts = { path: `/_users/${getUserId(user.username)}` };
  return utils.request(opts);
};

const setupTokenLoginSettings = (configureAppUrl = false, configureOidc = false) => {
  const settings = { token_login: { translation_key: 'login_sms', enabled: true } };
  if (configureAppUrl) {
    settings.app_url = utils.getOrigin();
  }
  if (configureOidc) {
    settings.oidc_provider = { client_id: 'test-client-id' };
  }
  return utils
    .updateSettings(settings, { ignoreReload: true })
    .then(() => utils.addTranslations('en', { login_sms: 'Instructions sms' }));
};

describe('login', () => {
  before(() => utils.saveDoc(parentPlace));
  after(() => utils.revertDb([], true));

  beforeEach(() => {
    user = {
      username: 'testuser',
      password,
      roles: ['district_admin'],
      place: {
        _id: 'fixture:test',
        type: 'health_center',
        name: 'TestVille',
        parent: 'PARENT_PLACE'
      },
      contact: {
        _id: 'fixture:user:testuser',
        name: 'Bob'
      },
    };
  });
  afterEach(() => utils.deleteUsers([user]).then(() => utils.revertDb(['PARENT_PLACE'], true)));

  describe('SSO login', () => {
    const loginWithSso = () => {
      const opts = {
        path: `/medic/login/oidc`,
        method: 'GET',
        resolveWithFullResponse: false,
        noAuth: true,
        redirect: 'manual',
        headers: { 'X-Forwarded-For': randomIp() },
      };
      return utils.request(opts);
    };

    const setupOidcSettings = (oidcBaseUrl) => {
      const settings = {
        oidc_provider: {
          discovery_url: `${oidcBaseUrl}/.well-known/openid-configuration`,
          client_id: 'cht',
          allow_insecure_requests: true
        }
      };

      return utils.updateSettings(settings, { ignoreReload: true });
    };

    const setCouchDBSecret = () => {
      const opts = {
        path: '/api/v1/credentials/oidc:client-secret',
        method: 'PUT',
        resolveWithFullResponse: true,
        json: false,
        body: 'couch-secret',
        headers: { 'Content-Type': 'text/plain' },
      };
      return utils.request(opts);
    };

    let server;

    const startMockApp = () => {
      return new Promise(resolve => {
        server = startOidcServer(resolve);
      });
    };

    const stopMockApp = () => {
      stopOidcServer(server);
    };

    beforeEach(() => startMockApp());

    afterEach(() => stopMockApp());

    it('should log in successfully', () => {
      delete user.password;
      user.oidc = true;

      const createOpts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };

      return getOidcBaseUrl()
        .then(oidcBaseUrl => setupOidcSettings(oidcBaseUrl))
        .then(() => setCouchDBSecret())
        .then(() => utils.request(createOpts))
        .then(() => loginWithSso())
        .then(response => {
          expectLoginToWork(response);
        });
    });
  });
});
