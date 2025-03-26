const { expect } = require('chai');
const sinon = require('sinon');

const config = require('../../src/libs/config');
const service = require('../../src/sso-login.js');

describe('SSO Login service', () => {
  beforeEach(() => {
    config.init({
      get: sinon.stub()
    });
  });
  afterEach(() => {
    sinon.restore();
  });

  describe('validateSsoLogin', () => {

    it('should return error message when oidc and password are present', async() => {
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' }});

      const data = { password: 'testPassword', oidc_provider: 'testClientId' };
      const result = await service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'Either OIDC Login only or Token/Password Login is allowed'
      });

      expect(data).to.deep.equal({ password: 'testPassword', oidc_provider: 'testClientId' });
    });

    it('should return error message when oidc and token_login = true', async() => {

      const data = { token_login: true, oidc_provider: 'testClientId' };
      const result = await service.validateSsoLogin(data);
      
      expect(result).to.deep.equal({
        msg: 'Either OIDC Login only or Token/Password Login is allowed'
      });

      expect(data).to.deep.equal({ token_login: true, oidc_provider: 'testClientId' });
    });

    it('should return error message when oidc_provider is not in app settings', async() => {
      const data = { oidc_provider: 'testClientId' };
      config.get.returns({ });
    
      const result = await service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'OIDC Login is not enabled'
      });

      expect(data).to.deep.equal({ oidc_provider: 'testClientId' });
    });

    it('should return error message when valid client id is not provided', async() => {
      const data = { oidc_provider: 'incorrectTestClientId' };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' }});
    
      const result = await service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'Invalid OIDC Client Id'
      });

      expect(data).to.deep.equal({ oidc_provider: 'incorrectTestClientId' });
    });

    it('should not return error message when valid client id is provided', async() => {
      const data = { oidc_provider: 'testClientId' };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' }});
    
      const result = await service.validateSsoLogin(data);

      expect(result).to.equal(undefined);

      expect(data).to.include({ oidc_provider: 'testClientId' });
    });

    it('should generate password if creating user', async() => {
      const data = { oidc_provider: 'testClientId' };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' }});
    
      const result = await service.validateSsoLogin(data);

      expect(result).to.equal(undefined);

      expect(data).to.include({ oidc_provider: 'testClientId' });
      expect(data).to.have.property('password');
    });


    it('should return undefined when oidc is not provided', async() => {
      const data = { password: 'testPassword' };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' }});
    
      const result = await service.validateSsoLogin(data);

      expect(result).to.equal(undefined);
    });
  });

});
