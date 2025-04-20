const sinon = require('sinon');
const chai = require('chai');
const environment = require('@medic/environment');
const service = require('../../../src/services/sso-login');
const login = require('../../../src/controllers/login');
const controller = require('../../../src/controllers/sso');

let req;
let res;
let redirect;

describe('SSO login', () => {
  beforeEach(() => {
    redirect = sinon.fake();

    req = {
      query: {},
      body: {},
      hostname: 'xx.app.medicmobile.org',
      protocol: 'http',
      headers: {cookie: ''},
      get: () => 'xx.app.medicmobile.org'
    };
    res = {
      redirect: redirect,
      send: () => {},
      status: () => {},
      json: () => {},
      cookie: () => {},
      clearCookie: () => {},
      setHeader: () => {}
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('oidcLogin', () => {
    it('should get token and redirect to homepage', async () => {
      sinon.stub(service, 'getIdToken').returns({ id_token: 'token', user: { username: 'lil' }});
      const getCookie = sinon.stub(service, 'getCookie').returns('AuthSession=cookie');
      const setCookies = sinon.stub(login, 'setCookies').returns('/');
      await controller.oidcLogin(req, res);
      chai.expect(redirect.calledWith('/')).to.be.true;
      chai.expect(getCookie.calledWith('lil')).to.be.true;
      chai.expect(setCookies.calledWith(req, res, null, 'AuthSession=cookie')).to.be.true;
    });

    it('should return login error response', async () => {
      sinon.stub(service, 'getIdToken').throws('Error');
      sinon.stub(login, 'sendLoginErrorResponse');
      await controller.oidcLogin(req, res);
      chai.expect(redirect.called).to.be.false;
    });
  });

  describe('oidcAuthorize', () => {
    it('should redirect to oidc provider', async () => {
      const getAuthorizationUrl = sinon.stub(service, 'getAuthorizationUrl').returns(new URL('https://oidc.server'));
      sinon.stub(environment, 'db').returns('medic');
      await controller.oidcAuthorize(req, res);
      chai.expect(redirect.calledWith(301, 'https://oidc.server/')).to.be.true;
      chai.expect(getAuthorizationUrl.calledWith('http://xx.app.medicmobile.org/medic/login/oidc/get_token')).to.be.true;
    });

    it('should return login error response', async () => {
      const e = new Error('Error');
      sinon.stub(service, 'getAuthorizationUrl').throws(e);
      sinon.stub(environment, 'db').returns('medic');
      const sendErrorResponse = sinon.stub(login, 'sendLoginErrorResponse');
      await controller.oidcAuthorize(req, res);
      chai.expect(redirect.called).to.be.false;
      chai.expect(sendErrorResponse.calledWith(e, res));
    });
  });
});
