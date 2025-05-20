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

  describe('validateSsoLogin: new oidc user', () => {
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
    });

    it('should return error message when oidc_provider is not in app settings', async () => {
      const data = { oidc_username: 'test' };
      config.get.returns(undefined);
    
      const result = await service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'Cannot set oidc_username when OIDC Login is not enabled.'
      });
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.notCalled).to.be.true;
    });

    it('should return error message when duplicate oidc user exists', async () => {
      const data = { oidc_username: 'test' };
      config.get.returns({ 'client_id': 'testClientId' });
      db.users.query.resolves({ rows: [{ doc: { _id: 'duplicate-user' } }] });

      const result = await service.validateSsoLogin(data);

      expect(result).to.deep.equal({
        msg: 'The oidc_username [test] already exists for user [duplicate-user].'
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: true, key: ['oidc_username', 'test'] }
      )).to.be.true;
    });

    it('should not return error message when oidc user is valid', async () => {
      const data = { oidc_username: 'test' };
      config.get.returns({ 'client_id': 'testClientId' });
      db.users.query.resolves({ rows: [] });

      const result = await service.validateSsoLogin(data);

      expect(result).to.equal(undefined);
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.calledOnceWithExactly()).to.be.true;
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: true, key: ['oidc_username', 'test'] }
      )).to.be.true;
    });

    it('should generate a password for a new oidc user', async () => {
      const data = { oidc_username: 'test' };
      config.get.withArgs('oidc_provider').returns({ 'client_id': 'testClientId' });
      db.users.query.resolves({ rows: [] });
      await service.validateSsoLogin(data);

      expect(generatePassword.calledOnceWithExactly()).to.be.true;
      expect(data).to.deep.equal({
        oidc_username: 'test',
        password_change_required: false,
        password: GENERATED_PASSWORD
      });
    });

    it('should return undefined when oidc_username is not provided', async () => {
      const data = { password: 'testPassword' };
      const result = await service.validateSsoLogin(data);
      expect(result).to.equal(undefined);
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.notCalled).to.be.true;
    });
  });

  describe('validateSsoLogin: oidc user update', () => {
    [
      {
        data: { password: 'testPassword', oidc_username: 'test', token_login: true },
        errorMessage: 'Cannot set password or token_login with oidc_username.'
      },
      {
        data: { password: 'testPassword', token_login: true }, // invalid oidc disablement
        errorMessage: 'Cannot set password when setting token_login.'
      }
    ].forEach(({ data, errorMessage }) => {
      it('should return error messsage when both password and token_login are provided', async () => {
        const user = { oidc_username: 'test' };

        const result = await service.validateSsoLogin(data, false, user);

        expect(result).to.deep.equal({ msg: errorMessage  });
        expect(config.get.notCalled).to.be.true;
        expect(generatePassword.notCalled).to.be.true;
        expect(db.users.query.notCalled).to.be.true;
      });
    });

    it('should not return error when auth fields are not', async () => {
      const user = { password: 'testPassword', oidc_username: 'test' };

      const result = await service.validateSsoLogin({ contact: 'z' }, false, user);

      expect(result).to.equal(undefined);
    });

    it('should not return error message when oidc user update is valid', async () => {
      const user = { oidc_username: 'test' };
      const data = { facility_id: 'z' };
      config.get.withArgs('oidc_provider').returns({ 'client_id': 'testClientId' });
      const result = await service.validateSsoLogin(data, false, user);
      expect(result).to.equal(undefined);
    });

    it('should not reset password for an oidc user update', async () => {
      const user = { oidc_username: true };
      const data = { facility_id: 'z' };
      config.get.withArgs('oidc_provider').returns({ 'client_id': 'testClientId' });
      await service.validateSsoLogin(data, false, user);
      expect(data).to.deep.equal({
        facility_id: 'z'
      });
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.notCalled).to.be.true;
    });

    [
      {
        data: { token_login: true },
        expectedUpdate: { token_login: true, password_change_required: false, password: GENERATED_PASSWORD }
      },
      {
        data: { password: 'password123' },
        expectedUpdate: { password: 'password123' }
      }
    ].forEach(({ data, expectedUpdate }) => {
      it('should not return error when disabling oidc login', async () => {
        config.get.withArgs('oidc_provider').returns({ 'client_id': 'testClientId' });
        const result = await service.validateSsoLogin(data, false, { oidc_username: 'test' });
        expect(result).to.be.undefined;
        expect(data).to.deep.equal(expectedUpdate);
      });
    });

    [
      {
        data: { token_login: true },
        expectedUpdate: { token_login: true, password_change_required: false, password: GENERATED_PASSWORD }
      },
      {
        data: { password: 'password123' },
        expectedUpdate: { password: 'password123' }
      }
    ].forEach(({ data, expectedUpdate }) => {
      it('should not require oidc login to be enabled in settings to disable oidc login user', async () => {
        config.get.withArgs('oidc_provider').returns(undefined);
        const result = await service.validateSsoLogin(data, false, { oidc_username: 'test' });
        expect(result).to.be.undefined;
        expect(data).to.deep.equal(expectedUpdate);
      });
    });

    it('should return error message when duplicate oidc user exists', async () => {
      const data = { oidc_username: 'test' };
      const user = {
        _id: 'org.couchdb.user:test',
        oidc_username: 'test'
      };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' } });
      db.users.query.resolves({ rows: [
        { doc: { _id: 'org.couchdb.user:test' } },
        { doc: { _id: 'duplicate-user' } }
      ] });

      const result = await service.validateSsoLogin(data, false, user);

      expect(result).to.deep.equal({
        msg: 'The oidc_username [test] already exists for user [org.couchdb.user:test].'
      });
      expect(data).to.deep.equal({ oidc_username: 'test' });
      expect(user).to.deep.equal({
        _id: 'org.couchdb.user:test',
        oidc_username: 'test'
      });
      expect(config.get.calledOnceWithExactly('oidc_provider')).to.be.true;
      expect(generatePassword.notCalled).to.be.true;
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: true, key: ['oidc_username', 'test'] }
      )).to.be.true;
    });

    it('should not return error message when oidc user is valid', async () => {
      const data = { oidc_username: 'test', _id: 'org.couchdb.user:test' };
      const user = {
        _id: 'org.couchdb.user:test',
        oidc_username: 'test',
      };
      config.get.returns({ 'oidc_provider': { 'client_id': 'testClientId' } });
      db.users.query.resolves({ rows: [{ doc: { _id: 'org.couchdb.user:test' } }] });

      const result = await service.validateSsoLogin(data, false, user);

      expect(result).to.equal(undefined);
      expect(data).to.deep.equal(data);
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: true, key: ['oidc_username', 'test'] }
      )).to.be.true;
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

  describe('getUsersByOidcUsername', () => {
    it('should return user document when oidc_username exists', async () => {
      const oidcUsername = 'test';
      const userDoc = { _id: 'userId', oidc_username: oidcUsername };
      db.users.query.resolves({ rows: [{ doc: userDoc }] });

      const result = await service.getUsersByOidcUsername(oidcUsername);

      expect(result).to.deep.equal([userDoc]);
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: true, key: ['oidc_username', oidcUsername] }
      )).to.be.true;
    });

    it('should throw error when user with oidc_username does not exist', async () => {
      const oidcUsername = 'test';
      db.users.query.resolves({ rows: [] });

      const result = await service.getUsersByOidcUsername(oidcUsername);

      expect(result).to.be.empty;
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: true, key: ['oidc_username', oidcUsername] }
      )).to.be.true;
    });

    it('should throw error when multiple users with oidc_username exist', async () => {
      const oidcUsername = 'test';
      const userDoc0 = { _id: 'userId0', oidc_username: oidcUsername };
      const userDoc1 = { _id: 'userId1', oidc_username: oidcUsername };
      db.users.query.resolves({ rows: [{ doc: userDoc0 }, { doc: userDoc1 }] });

      const result = await service.getUsersByOidcUsername(oidcUsername);

      expect(result).to.deep.equal([userDoc0, userDoc1]);
      expect(db.users.query.calledOnceWithExactly(
        'users/users_by_field',
        { include_docs: true, key: ['oidc_username', oidcUsername] }
      )).to.be.true;
    });
  });
});
