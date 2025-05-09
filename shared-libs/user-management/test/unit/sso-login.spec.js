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
    it('should return error message when oidc_username and password are present', () => {
      const data = { password: 'testPassword', oidc_username: 'test' };
      const result = service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'Cannot set password or token_login with oidc_username.'
      });
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
    });

    it('should return error message when oidc_username and token_login = true', () => {
      const data = { token_login: true, oidc_username: 'test' };
      const result = service.validateSsoLogin(data);
      
      expect(result).to.deep.equal({
        msg: 'Cannot set password or token_login with oidc_username.'
      });
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
    });

    it('should return error message when oidc_provider is not in app settings', () => {
      const data = { oidc_username: 'test' };
      config.get.returns(undefined);
    
      const result = service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'Cannot set oidc_username when OIDC Login is not enabled.'
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
    });

    it('should not return error message when oidc user is valid', () => {
      const data = { oidc_username: 'test' };
      config.get.returns({ 'client_id': 'testClientId' });

      const result = service.validateSsoLogin(data);

      expect(result).to.equal(undefined);
      expect(data).to.deep.equal({
        oidc_username: 'test',
        password_change_required: false,
        password: GENERATED_PASSWORD,
        roles: ['mm-oidc']
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
    });

    it('should return undefined when oidc_username is not provided', () => {
      const data = { password: 'testPassword' };
    
      const result = service.validateSsoLogin(data);

      expect(result).to.equal(undefined);
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
    });
  });

  describe('validateSsoLoginUpdate', () => {
    [
      { password: 'testPassword', oidc_username: 'test', token_login: true },
      { token_login: true }
    ].forEach((data) => {
      it('should return error message when token login modified to be invalid', () => {
        const user = { password: 'testPassword', oidc_username: 'test' };

        const result = service.validateSsoLoginUpdate(data, user);

        expect(result).to.deep.equal({
          msg: 'Cannot set token_login with oidc_username.'
        });
        expect(config.get.notCalled).to.be.true;
        expect(generatePassword.notCalled).to.be.true;
      });
    });

    [
      { oidc_username: 'test' },
      { password: 'testPassword' },
    ].forEach((data) => {
      it('should return error message when password modified to be invalid', () => {
        const user = { password: 'testPassword', oidc_username: 'test' };

        const result = service.validateSsoLoginUpdate(data, user);

        expect(result).to.deep.equal({
          msg: 'Cannot set password or token_login with oidc_username.'
        });
        expect(config.get.notCalled).to.be.true;
        expect(generatePassword.notCalled).to.be.true;
      });
    });

    it('should not return when auth fields not modified on invalid user', () => {
      const user = { password: 'testPassword', ooidc_username: 'test' };

      const result = service.validateSsoLoginUpdate({ contact: 'z' }, user);

      expect(result).to.equal(undefined);
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
    });

    it('should not return error message when oidc user is valid', () => {
      const data = {
        oidc_username: 'test',
        roles: ['existing-role']
      };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' } });

      const result = service.validateSsoLoginUpdate(data, data);

      expect(result).to.equal(undefined);
      expect(data).to.deep.equal({
        oidc_username: 'test',
        password_change_required: false,
        password: GENERATED_PASSWORD,
        roles: ['existing-role', 'mm-oidc']
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
    });

    it('should not add oidc role when it already exists', () => {
      const data = {
        oidc_username: 'test',
        roles: ['existing-role', 'mm-oidc']
      };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' } });

      const result = service.validateSsoLoginUpdate(data, data);

      expect(result).to.equal(undefined);
      expect(data).to.deep.equal({
        oidc_username: 'test',
        password_change_required: false,
        password: GENERATED_PASSWORD,
        roles: ['existing-role', 'mm-oidc']
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
    });
  });

  describe('isSsoLoginEnabled', () => {
    it('should return true when oidc_provider is set', () => {
      config.get.returns({ });
      const result = service.isSsoLoginEnabled();
      expect(result).to.be.true;
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
    });

    it('should return false when oidc_provider is not set', () => {
      config.get.returns(undefined);
      const result = service.isSsoLoginEnabled();
      expect(result).to.be.false;
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
    });
  });
});
