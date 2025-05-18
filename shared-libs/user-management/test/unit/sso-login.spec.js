const { expect } = require('chai');
const sinon = require('sinon');

const config = require('../../src/libs/config');
const service = require('../../src/sso-login');
const passwords = require('../../src/libs/passwords');

describe('SSO Login service', () => {
  const GENERATED_PASSWORD = 'generatedPassword';
  let generatePassword;

  beforeEach(() => {
    config.init({
      get: sinon.stub()
    });
    generatePassword = sinon.stub(passwords, 'generate').returns(GENERATED_PASSWORD);
  });
  afterEach(() => {
    sinon.restore();
  });

  describe('validateSsoLogin', () => {

    it('should return error message when oidc and password are present', () => {
      const data = { password: 'testPassword', oidc: true };
      const result = service.validateSsoLogin(data);
      expect(result).to.deep.equal({
        msg: 'Either OIDC Login only or Token/Password Login is allowed'
      });
    });

    it('should return error message when oidc and token_login = true', () => {
      const data = { token_login: true, oidc: true };
      const result = service.validateSsoLogin(data);
      expect(result).to.deep.equal({
        msg: 'Either OIDC Login only or Token/Password Login is allowed'
      });
    });

    it('should return error message when oidc_provider is not in app settings', () => {
      const data = { oidc: true };
      config.get.withArgs('oidc_provider').returns(undefined);
      const result = service.validateSsoLogin(data);
      expect(result).to.deep.equal({
        msg: 'OIDC Login is not enabled'
      });
    });

    it('should not return error message when oidc user is valid', () => {
      const data = { oidc: true };
      config.get.withArgs('oidc_provider').returns({ 'client_id': 'testClientId' });
      const result = service.validateSsoLogin(data);
      expect(result).to.equal(undefined);
      expect(data).to.deep.equal({
        oidc: true,
        password_change_required: false,
        password: GENERATED_PASSWORD
      });
    });

    it('should generate a password for a new oidc user', () => {
      const data = { oidc: true };
      config.get.withArgs('oidc_provider').returns({ 'client_id': 'testClientId' });

      service.validateSsoLogin(data);
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
      expect(data).to.deep.equal({
        oidc: true,
        password_change_required: false,
        password: GENERATED_PASSWORD
      });
    });

    it('should validate for when oidc is provided', () => {
      const data = { password: 'testPassword' };
      const result = service.validateSsoLogin(data);
      expect(result).to.equal(undefined);
      expect(generatePassword.notCalled).to.be.true;
    });
  });

  describe('validateSsoLoginUpdate', () => {
    [
      { password: 'testPassword', oidc: true, token_login: true },
      { password: 'testPassword', oidc: true },
      { token_login: true, oidc: true }
    ].forEach((data) => {
      it('should validate either oidc or password or token_login is being set', () => {
        const user = { oidc: true };
        const result = service.validateSsoLogin(data, false, user);
        expect(result).to.deep.equal({
          msg: 'Either OIDC Login only or Token/Password Login is allowed'
        });
      });
    });

    it('should not validate if auth fields are not modified', () => {
      const user = { oidc: true };
      const result = service.validateSsoLogin({ contact: 'z' }, false, user);
      expect(result).to.equal(undefined);
    });

    it('should not return error message when oidc user update is valid', () => {
      const user = { oidc: true };
      const data = { facility_id: 'z' };
      config.get.withArgs('oidc_provider').returns({ 'client_id': 'testClientId' });
      const result = service.validateSsoLogin(data, false, user);
      expect(result).to.equal(undefined);
    });

    it('should not reset password for an oidc user update', () => {
      const user = { oidc: true };
      const data = { facility_id: 'z' };
      config.get.withArgs('oidc_provider').returns({ 'client_id': 'testClientId' });
      service.validateSsoLogin(data, false, user);
      expect(data).to.deep.equal({
        facility_id: 'z'
      });
      expect(generatePassword.notCalled).to.be.true;
    });

    it('should reset password if disabling oidc login to token_login', () => {
      const user = { oidc: true };
      const data = { token_login: true, oidc: false };
      config.get.withArgs('oidc_provider').returns({ 'client_id': 'testClientId' });
      service.validateSsoLogin(data, false, user);
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
      expect(data).to.deep.equal({
        oidc: false,
        token_login: true,
        password_change_required: false,
        password: GENERATED_PASSWORD
      });
    });
  });
});
