const { expect } = require('chai');
const sinon = require('sinon');

const config = require('../../src/libs/config');
const service = require('../../src/sso-login');
const passwords = require('../../src/libs/passwords');
const db = require('../../src/libs/db');

describe('SSO Login service', () => {
  const GENERATED_PASSWORD = 'generatedPassword';
  let generatePassword;

  beforeEach(() => {
    config.init({
      get: sinon.stub()
    });
    generatePassword = sinon.stub(passwords, 'generate').returns(GENERATED_PASSWORD);
    db.init({ users: { query: sinon.stub() } });
  });
  afterEach(() => {
    sinon.restore();
  });

  describe('validateSsoLogin', () => {
    it('should return error message when oidc_username and password are present', async () => {
      const data = { password: 'testPassword', oidc_username: 'test' };
      const result = await service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'Cannot set password or token_login with oidc_username.'
      });
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.notCalled).to.be.true;
    });

    it('should return error message when oidc_username and token_login = true', async () => {
      const data = { token_login: true, oidc_username: 'test' };
      const result = await service.validateSsoLogin(data);
      
      expect(result).to.deep.equal({
        msg: 'Cannot set password or token_login with oidc_username.'
      });
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.notCalled).to.be.true;
    });

    it('should return error message when oidc_provider is not in app settings', async () => {
      const data = { oidc_username: 'test' };
      config.get.returns(undefined);
    
      const result = await service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'Cannot set oidc_username when OIDC Login is not enabled.'
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.notCalled).to.be.true;
    });

    it('should return error message when duplicate oidc user exists', async () => {
      const data = { oidc_username: 'test' };
      config.get.returns({ 'client_id': 'testClientId' });
      db.users.query.resolves({ rows: [{ id: 'duplicate-user' }] });

      const result = await service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'The oidc_username [test] already exists for user [duplicate-user].'
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: false, limit: 2, key: ['oidc_username', 'test'] }
      )).to.be.true;
    });

    it('should not return error message when oidc user is valid', async () => {
      const data = { oidc_username: 'test' };
      config.get.returns({ 'client_id': 'testClientId' });
      db.users.query.resolves({ rows: [] });

      const result = await service.validateSsoLogin(data);

      expect(result).to.equal(undefined);
      expect(data).to.deep.equal({
        oidc_username: 'test',
        password_change_required: false,
        password: GENERATED_PASSWORD,
        roles: ['mm-oidc']
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: false, limit: 2, key: ['oidc_username', 'test'] }
      )).to.be.true;
    });

    it('should return undefined when oidc_username is not provided', async () => {
      const data = { password: 'testPassword' };
    
      const result = await service.validateSsoLogin(data);

      expect(result).to.equal(undefined);
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.notCalled).to.be.true;
    });
  });

  describe('validateSsoLoginUpdate', () => {
    [
      { password: 'testPassword', oidc_username: 'test', token_login: true },
      { token_login: true }
    ].forEach((data) => {
      it('should return error message when token login modified to be invalid', async () => {
        const user = { password: 'testPassword', oidc_username: 'test' };
        const userSettings = { type: 'user-settings' };

        const result = await service.validateSsoLoginUpdate(data, user, userSettings);

        expect(result).to.deep.equal({
          msg: 'Cannot set token_login with oidc_username.'
        });
        expect(config.get.notCalled).to.be.true;
        expect(generatePassword.notCalled).to.be.true;
        expect(db.users.query.notCalled).to.be.true;
        expect(user).to.deep.equal({ password: 'testPassword', oidc_username: 'test' });
        expect(userSettings).to.deep.equal({ type: 'user-settings' });
      });
    });

    [
      { oidc_username: 'test' },
      { password: 'testPassword' },
    ].forEach((data) => {
      it('should return error message when password modified to be invalid', async () => {
        const user = { password: 'testPassword', oidc_username: 'test' };
        const userSettings = { type: 'user-settings' };

        const result = await service.validateSsoLoginUpdate(data, user, userSettings);

        expect(result).to.deep.equal({
          msg: 'Cannot set password or token_login with oidc_username.'
        });
        expect(config.get.notCalled).to.be.true;
        expect(generatePassword.notCalled).to.be.true;
        expect(db.users.query.notCalled).to.be.true;
        expect(user).to.deep.equal({ password: 'testPassword', oidc_username: 'test' });
        expect(userSettings).to.deep.equal({ type: 'user-settings' });
      });
    });

    it('should not return when auth fields not modified on invalid user', async () => {
      const user = { password: 'testPassword', oidc_username: 'test' };
      const userSettings = { type: 'user-settings' };

      const result = await service.validateSsoLoginUpdate({ contact: 'z' }, user, userSettings);

      expect(result).to.equal(undefined);
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.notCalled).to.be.true;
      expect(user).to.deep.equal({ password: 'testPassword', oidc_username: 'test' });
      expect(userSettings).to.deep.equal({ type: 'user-settings' });
    });

    it('should return error message when duplicate oidc user exists', async () => {
      const data = { oidc_username: 'test' };
      const user = {
        _id: 'org.couchdb.user:test',
        oidc_username: 'test',
        roles: ['existing-role']
      };
      const userSettings = {
        type: 'user-settings',
        roles: ['existing-role']
      };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' } });
      db.users.query.resolves({ rows: [{ id: 'org.couchdb.user:test' }, { id: 'duplicate-user' }] });

      const result = await service.validateSsoLoginUpdate(data, user, userSettings);

      expect(result).to.deep.equal({
        msg: 'The oidc_username [test] already exists for user [duplicate-user].'
      });
      expect(data).to.deep.equal({ oidc_username: 'test' });
      expect(user).to.deep.equal({
        _id: 'org.couchdb.user:test',
        oidc_username: 'test',
        roles: ['existing-role']
      });
      expect(userSettings).to.deep.equal({
        type: 'user-settings',
        roles: ['existing-role']
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: false, limit: 2, key: ['oidc_username', 'test'] }
      )).to.be.true;
    });

    it('should not return error message when oidc user is valid', async () => {
      const data = { oidc_username: 'test' };
      const user = {
        _id: 'org.couchdb.user:test',
        oidc_username: 'test',
        roles: ['existing-role']
      };
      const userSettings = {
        type: 'user-settings',
        roles: ['existing-role']
      };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' } });
      db.users.query.resolves({ rows: [{ id: 'org.couchdb.user:test' }] });

      const result = await service.validateSsoLoginUpdate(data, user, userSettings);

      expect(result).to.equal(undefined);
      expect(data).to.deep.equal({ oidc_username: 'test' });
      expect(user).to.deep.equal({
        _id: 'org.couchdb.user:test',
        oidc_username: 'test',
        password_change_required: false,
        password: GENERATED_PASSWORD,
        roles: ['existing-role', 'mm-oidc']
      });
      expect(userSettings).to.deep.equal({
        type: 'user-settings',
        roles: ['existing-role', 'mm-oidc']
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: false, limit: 2, key: ['oidc_username', 'test'] }
      )).to.be.true;
    });

    it('should not add oidc role when it already exists', async () => {
      const data = { oidc_username: 'test' };
      const user = {
        oidc_username: 'test',
        roles: ['existing-role', 'mm-oidc']
      };
      const userSettings = {
        type: 'user-settings',
      };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' } });
      db.users.query.resolves({ rows: [] });

      const result = await service.validateSsoLoginUpdate(data, user, userSettings);

      expect(result).to.equal(undefined);
      expect(data).to.deep.equal({ oidc_username: 'test' });
      expect(user).to.deep.equal({
        oidc_username: 'test',
        password_change_required: false,
        password: GENERATED_PASSWORD,
        roles: ['existing-role', 'mm-oidc']
      });
      expect(userSettings).to.deep.equal({
        type: 'user-settings',
        roles: ['existing-role', 'mm-oidc']
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: false, limit: 2, key: ['oidc_username', 'test'] }
      )).to.be.true;
    });

    it('should remove oidc role when a user is updated to not be oidc', async () => {
      const data = { oidc_username: null };
      const user = {
        oidc_username: null,
        roles: ['existing-role', 'mm-oidc']
      };
      const userSettings = {
        type: 'user-settings',
        roles: ['existing-role', 'mm-oidc']
      };

      const result = await service.validateSsoLoginUpdate(data, user, userSettings);

      expect(result).to.equal(undefined);
      expect(data).to.deep.equal({ oidc_username: null });
      expect(user).to.deep.equal({
        oidc_username: null,
        roles: ['existing-role']
      });
      expect(userSettings).to.deep.equal({
        type: 'user-settings',
        roles: ['existing-role']
      });
      expect(config.get.notCalled).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.notCalled).to.be.true;
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

  describe('getUserByOidcUsername', () => {
    it('should return user document when oidc_username exists', async () => {
      const oidcUsername = 'test';
      const userDoc = { _id: 'userId', oidc_username: oidcUsername };
      db.users.query.resolves({ rows: [{ doc: userDoc }] });

      const result = await service.getUserByOidcUsername(oidcUsername);

      expect(result).to.deep.equal(userDoc);
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: true, limit: 1, key: ['oidc_username', oidcUsername] }
      )).to.be.true;
    });

    it('should throw error when user with oidc_username does not exist', async () => {
      const oidcUsername = 'test';
      db.users.query.resolves({ rows: [] });

      await expect(service.getUserByOidcUsername(oidcUsername))
        .to.be.rejectedWith(`User with oidc_username [${oidcUsername}] not found.`);

      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: true, limit: 1, key: ['oidc_username', oidcUsername] }
      )).to.be.true;
    });

    it('should throw error when multiple users with oidc_username exist', async () => {
      const oidcUsername = 'test';
      db.users.query.resolves({ rows: [{}, {}] });

      await expect(service.getUserByOidcUsername(oidcUsername))
        .to.be.rejectedWith(`Multiple users with oidc_username [${oidcUsername}] found.`);

      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: true, limit: 1, key: ['oidc_username', oidcUsername] }
      )).to.be.true;
    });
  });
});
