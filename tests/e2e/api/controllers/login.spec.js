const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const utils = require('../../../utils');

let user;
const password = 'passwordSUP3RS3CR37!';
const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
};

const loginWithData = data => {
  const opts = {
    path: '/medic/login?aaa=aaa',
    method: 'POST',
    simple: false,
    noAuth: true,
    body: data,
    followRedirect: false,
  };
  return utils.request(opts);
};

const loginWithTokenLink = (token = '', hash = '') => {
  const opts = {
    path: `/medic/login/token/${token}/${hash}`,
    method: 'POST',
    simple: false,
    resolveWithFullResponse: true,
    noAuth: true,
    followRedirect: false,
    body: {},
  };
  return utils.request(opts);
};

const expectLoginToWork = (response) => {
  chai.expect(response).to.include({ statusCode: 302 });
  chai.expect(response.headers['set-cookie']).to.be.an('array');
  chai.expect(response.headers['set-cookie'].find(cookie => cookie.startsWith('AuthSession'))).to.be.ok;
  chai.expect(response.headers['set-cookie'].find(cookie => cookie.startsWith('userCtx'))).to.be.ok;
  chai.expect(response.body).to.equal('/');
};

const expectLoginToFail = (response) => {
  chai.expect(response.headers['set-cookie']).to.be.undefined;
  chai.expect(response.statusCode).to.equal(401);
};

const getUser = (user) => {
  const getUserId = n => `org.couchdb.user:${n}`;
  const opts = { path: `/_users/${getUserId(user.username)}` };
  return utils.request(opts);
};

const setupTokenLoginSettings = () => {
  const settings = { token_login: { app_url: utils.getOrigin(), translation_key: 'login_sms', enabled: true } };
  return utils
    .updateSettings(settings, true)
    .then(() => utils.addTranslations('en', { login_sms: 'Instructions sms' }));
};

const base64Encode = string => Buffer.from(string).toString('base64');

describe('login', () => {
  beforeAll(() => utils.saveDoc(parentPlace));
  afterAll(() => utils.revertDb());

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
  afterEach(() => utils.deleteUsers([user]).then(() => utils.revertDb(['PARENT_PLACE'])));

  describe('default login', () => {
    it('should fail with no data', () => {
      return loginWithData({ user: '', password: '' })
        .then(response => expectLoginToFail(response));
    });

    it('should fail with random credentials', () => {
      return loginWithData({ user: 'random', password: 'random' })
        .then(response => expectLoginToFail(response));
    });

    it('should fail with wrong credentials', () => {
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      return utils
        .request(opts)
        .then(() => loginWithData({ user: user.username, password: 'random' }))
        .then(response => expectLoginToFail(response));
    });

    it('should succeed with right credentials', () => {
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      return utils
        .request(opts)
        .then(() => loginWithData({ user: user.username, password }))
        .then(response => expectLoginToWork(response));
    });
  });

  describe('token login', () => {
    it('should fail with invalid url', () => {
      return setupTokenLoginSettings()
        .then(() => loginWithTokenLink())
        .then(response => chai.expect(response).to.deep.include({ statusCode: 401 }));
    });

    it('should fail with invalid data', () => {
      return setupTokenLoginSettings()
        .then(() => loginWithTokenLink('token', 'hash'))
        .then(response => expectLoginToFail(response));
    });

    it('should fail with mismatched data', () => {
      user.phone = '+40755565656';
      user.token_login = true;
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      return setupTokenLoginSettings()
        .then(() => utils.request(opts))
        .then(() => loginWithData({ user: user.username, password }))
        .then(response => expectLoginToFail(response))
        .then(() => getUser(user))
        .then(user => loginWithTokenLink(user.token_login.token, 'randomHash'))
        .then(response => expectLoginToFail(response));
    });

    it('should fail with expired data', () => {
      user.phone = '+40755565656';
      user.token_login = true;
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      let tokenLogin;
      return setupTokenLoginSettings()
        .then(() => utils.request(opts))
        .then(() => getUser(user))
        .then(user => {
          // cheat and set the expiration date in the past
          user.token_login.expiration_date = 0;
          tokenLogin = user.token_login;
          return utils.request({ method: 'PUT', path: `/_users/${user._id}`, body: user });
        })
        .then(() => loginWithTokenLink(tokenLogin.token, base64Encode(user.username)))
        .then(response => expectLoginToFail(response));
    });

    it('should succeed with correct data', () => {
      user.phone = '+40755565656';
      user.token_login = true;
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      let tokenLogin;
      return setupTokenLoginSettings()
        .then(() => utils.request(opts))
        .then(() => getUser(user))
        .then(user => tokenLogin = user.token_login)
        .then(() => loginWithTokenLink(tokenLogin.token, base64Encode(user.username)))
        .then(response => expectLoginToWork(response))
        .then(() => loginWithTokenLink(tokenLogin.token, base64Encode(user.username)))
        .then(response => expectLoginToFail(response)); // fails after being activated the 1st time
    });
  });
});
