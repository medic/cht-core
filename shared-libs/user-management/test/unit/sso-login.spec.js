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
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
    });

    it('should return error message when oidc and token_login = true', () => {
      const data = { token_login: true, oidc: true };
      const result = service.validateSsoLogin(data);
      
      expect(result).to.deep.equal({
        msg: 'Either OIDC Login only or Token/Password Login is allowed'
      });
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
    });

    it('should return error message when oidc_provider is not in app settings', () => {
      const data = { oidc: true };
      config.get.returns({ });
    
      const result = service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'OIDC Login is not enabled'
      });
      expect(config.get.calledOnceWithExactly()).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
    });

    it('should not return error message when oidc user is valid', () => {
      const data = { oidc: true };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' } });

      const result = service.validateSsoLogin(data);

      expect(result).to.equal(undefined);
      expect(data).to.deep.equal({
        oidc: true,
        password_change_required: false,
        password: GENERATED_PASSWORD
      });
      expect(config.get.calledOnceWithExactly()).to.be.true;
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
    });

    it('should return undefined when oidc is not provided', () => {
      const data = { password: 'testPassword' };
    
      const result = service.validateSsoLogin(data);

      expect(result).to.equal(undefined);
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
    });
  });

  describe('validateSsoLoginUpdate', () => {

    [
      { password: 'testPassword', oidc: true, token_login: true },
      { oidc: true },
      { password: 'testPassword' },
      { token_login: true }
    ].forEach((data) => {
      it('should return error message data modified to be invalid', () => {
        const user = { password: 'testPassword', oidc: true };

        const result = service.validateSsoLoginUpdate(data, user);

        expect(result).to.deep.equal({
          msg: 'Either OIDC Login only or Token/Password Login is allowed'
        });
        expect(config.get.notCalled).to.be.true;
        expect(generatePassword.notCalled).to.be.true;
      });
    });

    it('should not return when auth fields not modified on invalid user', () => {
      const user = { password: 'testPassword', oidc: true };

      const result = service.validateSsoLoginUpdate({ contact: 'z' }, user);

      expect(result).to.equal(undefined);
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
    });

    it('should not return error message when oidc user is valid', () => {
      const data = { oidc: true };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' } });

      const result = service.validateSsoLoginUpdate(data, data);

      expect(result).to.equal(undefined);
      expect(data).to.deep.equal({
        oidc: true,
        password_change_required: false,
        password: GENERATED_PASSWORD
      });
      expect(config.get.calledOnceWithExactly()).to.be.true;
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
    });
  });
});
