const chai = require('chai');
const sinon = require('sinon');

const db = require('../../src/libs/db');
const service = require('../../src/sso-login.js');

let clock;

describe('SSO Login service', () => {
  beforeEach(() => {
    db.init({
      medic: { get: sinon.stub(), put: sinon.stub(), allDocs: sinon.stub() }
    });
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('getSettingsDoc', () => {
    it('should return the correct settings document', async() => {
      db.medic.get.withArgs('settings').resolves({ 'settings': { 'oidc_provider': { 'client_id': 'testClientId' } } });

      const settings = await service.getSettingsDoc();

      chai.expect(settings).to.not.equal(undefined);
      chai.expect(settings.settings).to.have.keys(['oidc_provider']);
      chai.expect(settings.settings.oidc_provider).to.have.keys(['client_id']);
      chai.expect(settings.settings.oidc_provider).to.include({ client_id: 'testClientId' });
    });
  });

  describe('hasBothOidcAndTokenOrPasswordLogin', () => {
    it('should return true when oidc and password are present', () => {
      const data = { password: 'testPassword', oidc_provider: 'testClientId' };
      const result = service.hasBothOidcAndTokenOrPasswordLogin(data);
      
      chai.expect(result).to.equal(true);
      chai.expect(data).to.have.keys(['password', 'oidc_provider']);
      chai.expect(data).to.include({ password: 'testPassword', oidc_provider: 'testClientId' });
    });

    it('should return true when oidc and token_login = true', () => {

      const data = { token_login: true, oidc_provider: 'testClientId' };
      const result = service.hasBothOidcAndTokenOrPasswordLogin(data);
        
      chai.expect(result).to.equal(true);
      chai.expect(data).to.have.keys(['token_login', 'oidc_provider']);
      chai.expect(data).to.include({ token_login: true, oidc_provider: 'testClientId' });
    });

    it('should return falsy when oidc and token_login = false', () => {

      const data = { token_login: false, oidc_provider: 'testClientId' };
      const result = service.hasBothOidcAndTokenOrPasswordLogin(data);
        
      chai.expect(result).to.equal(false);
      chai.expect(data).to.have.keys(['token_login', 'oidc_provider']);
      chai.expect(data).to.include({ token_login: false, oidc_provider: 'testClientId' });
    });

    it('should return falsy when only oidc is provided', () => {
      const data = { oidc_provider: 'testClientId' };
      const result = service.hasBothOidcAndTokenOrPasswordLogin(data);
        
      chai.expect(result).to.equal(false);
      chai.expect(data).to.have.keys(['oidc_provider']);
      chai.expect(data).to.include({ oidc_provider: 'testClientId' });
    });
  });

  describe('isSsoLoginEnabled', () => {

    it('should return falsy when oidc_provider is not in app settings', () => {
      const settings = { };
      const result = service.isSsoLoginEnabled(settings);

      chai.expect(result).to.equal(false);
      chai.expect(settings).to.not.have.keys(['oidc_provider']);
      chai.expect(settings.oidc_provider).to.equal(undefined);
    });

    it('should return falsy when oidc_provider is in app settings, but has no client id', () => {
      const settings = { 'oidc_provider': {}};
      const result = service.isSsoLoginEnabled(settings);
  
      chai.expect(result).to.equal(false);
      chai.expect(settings).to.have.keys(['oidc_provider']);
      chai.expect(settings.oidc_provider.client_id).to.equal(undefined);
    });

    it('should return true when oidc_provider is in app settings, and it has client id', () => {
      const settings = { 'oidc_provider': { 'client_id': 'testClientId' }};
      const result = service.isSsoLoginEnabled(settings);
  
      chai.expect(result).to.equal(true);
      chai.expect(settings).to.have.keys(['oidc_provider']);
      chai.expect(settings.oidc_provider).to.have.keys(['client_id']);
      chai.expect(settings.oidc_provider).to.include({ client_id: 'testClientId' });
    });
  });

  describe('isOidcClientIdValid', () => {

    it('should return falsy when oidc_provider is not in app settings', () => {
      const clientId = 'testClientId';
      const settings = { };
      const result = service.isOidcClientIdValid(settings, clientId);
  
      chai.expect(result).to.equal(false);
      chai.expect(settings).to.not.have.keys(['oidc_provider']);
      chai.expect(settings.oidc_provider).to.equal(undefined);
    });

    it('should return falsy when oidc_provider (request client id) is not provided', () => {
      const clientId = undefined;
      const settings = { 'oidc_provider': { 'client_id': 'testClientId' }};
      const result = service.isOidcClientIdValid(settings, clientId);
  
      chai.expect(result).to.equal(false);
      chai.expect(settings).to.have.keys(['oidc_provider']);
      chai.expect(settings.oidc_provider).to.include({ client_id: 'testClientId' });
      chai.expect(clientId).to.equal(undefined);
    });

    it('should return falsy when o_p.client_id is in app settings, but doesn\'t match with oidc_provider', () => {

      const clientId = 'differentTestOidcProvider';
      const settings = { 'oidc_provider': { 'client_id': 'testClientId' }};
      const result = service.isOidcClientIdValid(settings, clientId);
  
      chai.expect(result).to.equal(false);
      chai.expect(settings).to.have.keys(['oidc_provider']);
      chai.expect(settings.oidc_provider).to.include({ client_id: 'testClientId' });
      chai.expect(clientId).to.equal('differentTestOidcProvider');
    });

    it('should return true when oidc_provider.client_id is in app settings, and it matches the oidc_provider', () => {

      const clientId = 'testClientId';
      const settings = { 'oidc_provider': { 'client_id': 'testClientId' }};
      const result = service.isOidcClientIdValid(settings, clientId);
  
      chai.expect(result).to.equal(true);
      chai.expect(settings).to.have.keys(['oidc_provider']);
      chai.expect(settings.oidc_provider).to.include({ client_id: 'testClientId' });
      chai.expect(clientId).to.equal('testClientId');
    });
  });

  describe('validateSsoLogin', () => {

    it('should return error message when oidc and password are present', async() => {
      db.medic.get.withArgs('settings').resolves({ 'settings': { 'oidc_provider': { 'client_id': 'testClientId' } } });

      const data = { password: 'testPassword', oidc_provider: 'testClientId' };
      const result = await service.validateSsoLogin(data);

      chai.expect(result).to.deep.equal({
        msg: 'Either OIDC Login only or Token/Password Login is allowed'
      });
      chai.expect(data).to.deep.equal({ password: 'testPassword', oidc_provider: 'testClientId' });
    });

    it('should return error message when oidc and token_login = true', async() => {

      const data = { token_login: true, oidc_provider: 'testClientId' };
      const result = await service.validateSsoLogin(data);
      
      chai.expect(result).to.deep.equal({
        msg: 'Either OIDC Login only or Token/Password Login is allowed'
      });

      chai.expect(data).to.deep.equal({ token_login: true, oidc_provider: 'testClientId' });
    });

    it('should return error message when oidc_provider is not in app settings', async() => {
      const data = { oidc_provider: 'testClientId' };
      db.medic.get.withArgs('settings').resolves({ 'settings': { } });
    
      const result = await service.validateSsoLogin(data);

      chai.expect(result).to.deep.equal({
        msg: 'OIDC Login is not enabled'
      });

      chai.expect(data).to.deep.equal({ oidc_provider: 'testClientId' });
    });

    it('should return error message when valid client id is not provided', async() => {
      const data = { oidc_provider: 'incorrectTestClientId' };
      db.medic.get.withArgs('settings').resolves({ 'settings': { 'oidc_provider': { 'client_id': 'testClientId' } } });
    
      const result = await service.validateSsoLogin(data);

      chai.expect(result).to.deep.equal({
        msg: 'Invalid OIDC Client Id'
      });

      chai.expect(data).to.deep.equal({ oidc_provider: 'incorrectTestClientId' });
    });

    it('should not return error message when valid client id is provided', async() => {
      const data = { oidc_provider: 'testClientId' };
      db.medic.get.withArgs('settings').resolves({ 'settings': { 'oidc_provider': { 'client_id': 'testClientId' } } });
    
      const result = await service.validateSsoLogin(data);

      chai.expect(result).to.equal(undefined);

      chai.expect(data).to.include({ oidc_provider: 'testClientId' });
    });

    it('should generate password', async() => {
      const data = { oidc_provider: 'testClientId' };
      db.medic.get.withArgs('settings').resolves({ 'settings': { 'oidc_provider': { 'client_id': 'testClientId' } } });
    
      const result = await service.validateSsoLogin(data);

      chai.expect(result).to.equal(undefined);

      chai.expect(data).to.include({ oidc_provider: 'testClientId' });
      chai.expect(data).to.have.property('password');
    });

  });

});
