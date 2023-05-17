const chai = require('chai');
const sinon = require('sinon');

const config = require('../../src/libs/config');
const db = require('../../src/libs/db');
const service = require('../../src/token-login');

const oneDayInMS = 24 * 60 * 60 * 1000;

let clock;

describe('TokenLogin service', () => {
  beforeEach(() => {
    config.init({
      get: sinon.stub(),
      getTransitionsLib: sinon.stub(),
    });
    db.init({
      medic: { get: sinon.stub(), put: sinon.stub(), allDocs: sinon.stub() },
      users: { get: sinon.stub(), put: sinon.stub() },
      syncShards: sinon.stub().resolves(),
    });
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('isTokenLoginEnabled', () => {
    it('should return falsy when no setting', () => {
      config.get.returns();
      chai.expect(service.isTokenLoginEnabled()).to.equal(false);
      chai.expect(config.get.callCount).to.deep.equal(1);
      chai.expect(config.get.args[0]).to.deep.equal(['token_login']);
    });

    it('should return falsy when not enabled', () => {
      config.get.withArgs('token_login').returns({ enabled: false });
      chai.expect(service.isTokenLoginEnabled()).to.equal(false);
    });

    it('should return true when enabled', () => {
      config.get.withArgs('token_login').returns({ enabled: true });
      chai.expect(service.isTokenLoginEnabled()).to.equal(true);
    });
  });

  describe('shouldEnableTokenLogin', () => {
    it('should return falsey when not token login not configured', () => {
      config.get.returns({});
      chai.expect(service.shouldEnableTokenLogin({ token_login: true })).to.equal(false);
    });

    it('should return falsey when data does not request token_login to be enabled', () => {
      config.get.withArgs('token_login').returns({ enabled: true, message: 'message' });
      chai.expect(service.shouldEnableTokenLogin({})).to.equal(false);
    });

    it('should return true when configured and requested', () => {
      config.get.withArgs('token_login').returns({ enabled: true, message: 'message' });
      chai.expect(service.shouldEnableTokenLogin({ token_login: true })).to.equal(true);
    });
  });

  describe('validateTokenLogin', () => {
    beforeEach(() => {
      config.get.withArgs('token_login').returns({ enabled: true, message: 'message' });
    });

    describe('on create', () => {
      it('should do nothing when token login not required', () => {
        const data = {};
        service.validateTokenLogin(data, true);
        chai.expect(data).to.deep.equal({});
      });

      it('should return an error when phone number is not present', () => {
        const data = { token_login: true };
        const result = service.validateTokenLogin(data, true);
        chai.expect(result).to.deep.equal({
          msg: 'A valid phone number is required for SMS login.',
          key: 'configuration.enable.token.login.phone'
        });
        chai.expect(data).to.deep.equal({ token_login: true });
      });

      it('should return an error when phone number is not valid', () => {
        const data = { token_login: true, phone: 'aaaaa' };
        const result = service.validateTokenLogin(data, true);
        chai.expect(result).to.deep.equal({
          msg: 'A valid phone number is required for SMS login.',
          key: 'configuration.enable.token.login.phone'
        });
        chai.expect(data).to.deep.equal({ token_login: true, phone: 'aaaaa' });
      });

      it('should assign password and normalize phone when phone is valid', () => {
        const data = { token_login: true, phone: '+40 755 336-699' };
        const result = service.validateTokenLogin(data, true);
        chai.expect(result).to.equal(undefined);
        chai.expect(data).to.have.keys(['token_login', 'phone', 'password']);
        chai.expect(data).to.include({ token_login: true, phone: '+40755336699' });
        chai.expect(data.password.length).to.equal(20);
      });
    });

    describe('on edit', () => {
      it('should do nothing when no changes', () => {
        const user = { _id: 'user', name: 'user', known: true, facility_id: 'aaa' };
        const settings = { _id: 'user', name: 'user', contact_id: 'bbb' };
        const data = {};
        const result = service.validateTokenLogin(data, false, user, settings);
        // no changes to provided data
        chai.expect(result).to.equal(undefined);
        chai.expect(user).to.deep.equal({ _id: 'user', name: 'user', known: true, facility_id: 'aaa' });
        chai.expect(settings).to.deep.equal({ _id: 'user', name: 'user', contact_id: 'bbb' });
      });

      describe('when disabling', () => {
        it('should do nothing when token login not enabled', () => {
          const user = { _id: 'user', name: 'user', known: true, facility_id: 'aaa' };
          const settings = { _id: 'user', name: 'user', contact_id: 'bbb' };
          const data = { token_login: false };
          const result = service.validateTokenLogin(data, false, user, settings);
          // no changes to provided data
          chai.expect(result).to.equal(undefined);
          chai.expect(user).to.deep.equal({ _id: 'user', name: 'user', known: true, facility_id: 'aaa' });
          chai.expect(settings).to.deep.equal({ _id: 'user', name: 'user', contact_id: 'bbb' });
        });

        it('should require password', () => {
          const user = { _id: 'user', name: 'user', token_login: true };
          const settings = { _id: 'user', name: 'user', contact_id: 'bbb', token_login: true };
          const data = { token_login: false };
          const result = service.validateTokenLogin(data, false, user, settings);
          chai.expect(result).to.deep.equal({
            msg: 'Password is required when disabling token login.',
            key: 'password.length.minimum',
          });
          // no changes to provided data
          chai.expect(user).to.deep.equal({ _id: 'user', name: 'user', token_login: true });
          chai.expect(settings).to.deep.equal({ _id: 'user', name: 'user', contact_id: 'bbb', token_login: true });
          chai.expect(data).to.deep.equal({ token_login: false });
        });

        it('should do nothing when password is present', () => {
          const user = { _id: 'user', name: 'user', token_login: true };
          const settings = { _id: 'user', name: 'user', contact_id: 'bbb', token_login: true };
          const data = { token_login: false, password: 'superSecret' };
          const result = service.validateTokenLogin(data, false, user, settings);
          chai.expect(result).to.deep.equal(undefined);
          // no changes to provided data
          chai.expect(user).to.deep.equal({ _id: 'user', name: 'user', token_login: true });
          chai.expect(settings).to.deep.equal({ _id: 'user', name: 'user', contact_id: 'bbb', token_login: true });
          chai.expect(data).to.deep.equal({ token_login: false, password: 'superSecret' });
        });
      });

      describe('when enabling', () => {
        it('should return an error when no phone number', () => {
          const user = { _id: 'user', name: 'user' };
          const settings = { _id: 'user', name: 'user', contact_id: 'aaa' };
          const data = { token_login: true };
          const result = service.validateTokenLogin(data, false, user, settings);
          chai.expect(result).to.deep.equal({
            msg: 'A valid phone number is required for SMS login.',
            key: 'configuration.enable.token.login.phone'
          });
          // no changes to provided data
          chai.expect(user).to.deep.equal({ _id: 'user', name: 'user' });
          chai.expect(settings).to.deep.equal({ _id: 'user', name: 'user', contact_id: 'aaa' });
          chai.expect(data).to.deep.equal({ token_login: true });
        });

        it('should return an error when phone is invalid', () => {
          const user = { _id: 'user', name: 'user' };
          const settings = { _id: 'user', name: 'user', contact_id: 'aaa', phone: 'aaaa' };
          const data = { token_login: true };
          const result = service.validateTokenLogin(data, false, user, settings);
          chai.expect(result).to.deep.equal({
            msg: 'A valid phone number is required for SMS login.',
            key: 'configuration.enable.token.login.phone'
          });
          // no changes to provided data
          chai.expect(user).to.deep.equal({ _id: 'user', name: 'user' });
          chai.expect(settings).to.deep.equal({ _id: 'user', name: 'user', contact_id: 'aaa', phone: 'aaaa' });
          chai.expect(data).to.deep.equal({ token_login: true });
        });

        it('should normalize phone and reset password when phone is valid', () => {
          const user = { _id: 'user', name: 'user' };
          const settings = { _id: 'user', name: 'user', contact_id: 'aaa', phone: '+40 (766) 23-23-23' };
          const data = { token_login: true };
          const result = service.validateTokenLogin(data, false, user, settings);
          chai.expect(result).to.deep.equal(undefined);
          // new password
          chai.expect(user).to.have.all.keys(['_id', 'name', 'password']);
          chai.expect(user.password.length).to.equal(20);
          // normalized phone
          chai.expect(settings).to.deep.equal({ _id: 'user', name: 'user', contact_id: 'aaa', phone: '+40766232323' });
          chai.expect(data).to.deep.equal({ token_login: true });
        });
      });
    });
  });

  describe('getUserByToken', () => {
    it('should reject with no input', () => {
      return service
        .getUserByToken()
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ status: 401, error: 'invalid' });
          chai.expect(db.users.get.callCount).to.equal(0);
        });
    });

    it('should throw when token_login doc not found', () => {
      db.medic.get.rejects({ status: 404 });
      const token = 'my_token';
      return service
        .getUserByToken(token)
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ status: 401, error: 'invalid' });
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.args[0]).to.deep.equal([`token:login:${token}`]);
        });
    });

    it('should throw when user not found', () => {
      db.medic.get.resolves({ user: 'org.couchdb.user:someuser' });
      db.users.get.rejects({ status: 404 });
      return service
        .getUserByToken('omgtoken')
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ status: 401, error: 'invalid' });
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.args[0]).to.deep.equal([`token:login:omgtoken`]);
          chai.expect(db.users.get.callCount).to.equal(1);
          chai.expect(db.users.get.args[0]).to.deep.equal(['org.couchdb.user:someuser']);
        });
    });

    it('should return false when no matches found', () => {
      db.medic.get.resolves({ user: 'org.couchdb.user:otheruser' });
      db.users.get.resolves({ token_login: { token: 'not token' } });
      return service
        .getUserByToken('sometoken')
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ status: 401, error: 'invalid' });
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.args[0]).to.deep.equal([`token:login:sometoken`]);
          chai.expect(db.users.get.callCount).to.equal(1);
          chai.expect(db.users.get.args[0]).to.deep.equal(['org.couchdb.user:otheruser']);
        });
    });

    it('should throw when match is expired', () => {
      db.medic.get.resolves({ user: 'org.couchdb.user:user' });
      db.users.get.resolves({ token_login: { active: true, token: 'the_token', expiration_date: 0 } });
      return service
        .getUserByToken('the_token')
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ status: 401, error: 'expired' });
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.args[0]).to.deep.equal([`token:login:the_token`]);
          chai.expect(db.users.get.callCount).to.equal(1);
          chai.expect(db.users.get.args[0]).to.deep.equal(['org.couchdb.user:user']);
        });
    });

    it('should return the row id when match is not expired', () => {
      const future = new Date().getTime() + 1000;
      db.medic.get.resolves({ user: 'org.couchdb.user:user_id' });
      db.users.get.resolves({
        _id: 'org.couchdb.user:user_id',
        token_login: {
          active: true,
          token: 'the_token',
          expiration_date: future
        },
      });
      return service.getUserByToken('the_token').then(response => {
        chai.expect(response).to.equal('org.couchdb.user:user_id');
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0]).to.deep.equal([`token:login:the_token`]);
        chai.expect(db.users.get.callCount).to.equal(1);
        chai.expect(db.users.get.args[0]).to.deep.equal(['org.couchdb.user:user_id']);
      });
    });

    it('should throw when get errors', () => {
      db.medic.get.resolves({ user: 'org.couchdb.user:user_id' });
      db.users.get.rejects({ some: 'err' });
      return service
        .getUserByToken('t', 'h')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => chai.expect(err).to.deep.equal({ some: 'err' }));
    });

    it('should throw when get errors', () => {
      db.medic.get.rejects({ other: 'err' });
      return service
        .getUserByToken('t', 'h')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => chai.expect(err).to.deep.equal({ other: 'err' }));
    });
  });

  describe('resetPassword', () => {
    it('should throw an error when user not found', () => {
      db.users.get.rejects({ status: 404 });

      return service
        .resetPassword('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.include({ status: 404 });
        });
    });

    it('should throw an error when user is invalid', () => {
      db.users.get.resolves({ name: 'user' });
      return service
        .resetPassword('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ code: 400, message: 'invalid user' });
        });
    });

    it('should throw an error when user token not active', () => {
      db.users.get.resolves({ name: 'user', token_login: { active: false } });
      return service
        .resetPassword('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ code: 400, message: 'invalid user' });
        });
    });

    it('should update the users password', () => {
      const user = {
        name: 'sally',
        roles: ['a', 'b'],
        facilty_id: 'c',
        type: 'user',
        token_login: {
          active: true,
          token: 'aaaa',
          expiration_date: 0,
        },
      };

      db.users.get.resolves(user);
      db.users.put.resolves();

      return service.resetPassword('userID').then(response => {
        chai.expect(response).to.deep.equal({
          password: user.password,
          user: 'sally'
        });
        chai.expect(user.password.length).to.equal(20);

        chai.expect(db.users.get.callCount).to.equal(1);
        chai.expect(db.users.get.args[0]).to.deep.equal(['userID']);

        chai.expect(db.users.put.callCount).to.equal(1);
        chai.expect(db.users.put.args[0]).to.deep.equal([{
          name: 'sally',
          roles: ['a', 'b'],
          facilty_id: 'c',
          type: 'user',
          token_login: {
            active: true,
            token: 'aaaa',
            expiration_date: 0,
          },
          password: user.password,
        }]);
      });
    });
  });

  describe('deactivate token login', () => {
    it('should throw an error when user not found', () => {
      db.users.get.rejects({ status: 404 });
      db.medic.get.rejects({ status: 404 });

      return service
        .deactivateTokenLogin('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.include({ status: 404 });
        });
    });

    it('should throw an error when user is invalid', () => {
      db.users.get.resolves({ name: 'user' });
      db.medic.get.resolves({ name: 'user' });
      return service
        .deactivateTokenLogin('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ code: 400, message: 'invalid user' });
        });
    });

    it('should throw an error when user token not active', () => {
      db.users.get.resolves({ name: 'user', token_login: { active: false } });
      db.medic.get.resolves({ name: 'user', token_login: { active: false } });
      return service
        .deactivateTokenLogin('userId')
        .then(() => chai.assert.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ code: 400, message: 'invalid user' });
        });
    });

    it('should de-activate token login', () => {
      const user = {
        name: 'sally',
        roles: ['a', 'b'],
        facilty_id: 'c',
        type: 'user',
        token_login: {
          active: true,
          token: 'aaaa',
          expiration_date: 0,
        },
      };
      const userSettings = {
        name: 'sally',
        roles: ['a', 'b'],
        phone: 'c',
        type: 'user-settings',
        token_login: { active: true, expiration_date: 0 },
      };

      db.users.get.resolves(user);
      db.medic.get.resolves(userSettings);
      db.users.put.resolves();
      db.medic.put.resolves();
      clock.tick(123);

      return service.deactivateTokenLogin('userID').then(() => {
        chai.expect(db.users.get.callCount).to.equal(1);
        chai.expect(db.users.get.args[0]).to.deep.equal(['userID']);
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0]).to.deep.equal(['userID']);

        chai.expect(db.users.put.callCount).to.equal(1);
        chai.expect(db.users.put.args[0]).to.deep.equal([{
          name: 'sally',
          roles: ['a', 'b'],
          facilty_id: 'c',
          type: 'user',
          token_login: {
            active: false,
            login_date: 123,
            token: 'aaaa',
            expiration_date: 0,
          },
        }]);
        chai.expect(db.medic.put.callCount).to.equal(1);
        chai.expect(db.medic.put.args[0]).to.deep.equal([{
          name: 'sally',
          roles: ['a', 'b'],
          phone: 'c',
          type: 'user-settings',
          token_login: { active: false, expiration_date: 0, login_date: 123 },
        }]);
      });
    });
  });

  describe('manageTokenLogin', () => {
    it('should do nothing when undefined', () => {
      return service.manageTokenLogin({}, '', { user: { id: 'user' } }).then(actual => {
        chai.expect(actual).to.deep.equal({ user: { id: 'user' } });
      });
    });

    it('should do nothing when no config', () => {
      config.get.withArgs('token_login').returns();
      return service.manageTokenLogin({ token_login: true }, '', { user: { id: 'user' } }).then(actual => {
        chai.expect(actual).to.deep.equal({ user: { id: 'user' } });
      });
    });

    describe('disabling token login', () => {
      it('should do nothing when user does not have token_login configured', () => {
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };
        db.medic.get.withArgs('userID').resolves({ _id: 'userID' });
        db.users.get.withArgs('userID').resolves({ _id: 'userID' });

        return service.manageTokenLogin({ token_login: false }, '', response).then(actual => {
          chai.expect(actual).to.deep.equal({ user: { id: 'userID' }, 'user-settings': { id: 'userID' } });
        });
      });

      it('should disable token login when requested', () => {
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };
        const responseCopy = Object.assign({}, response);
        db.medic.get
          .withArgs('userID').resolves({
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 123 },
          })
          .withArgs('token:login:aaa').resolves({
            _id: 'token:login:aaa',
            type: 'token_login',
            user: 'userID',
            tasks: [
              { state: 'pending', messages: [{ message: 'sms1' }] },
              { state: 'pending', messages: [{ message: 'sms2' }] },
            ]
          });
        db.users.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          token_login: {
            active: true,
            expiration_date: 123,
            token: 'aaa',
          }
        });

        db.medic.put.resolves();
        db.users.put.resolves();

        return service.manageTokenLogin({ token_login: false }, '', response).then(actual => {
          chai.expect(db.medic.put.callCount).to.equal(2);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'token:login:aaa',
            type: 'token_login',
            user: 'userID',
            tasks: [
              {
                state: 'cleared',
                messages: [{ message: 'sms1' }],
                gateway_ref: undefined,
                state_details: undefined,
                state_history: [{ state: 'cleared', state_details: undefined, timestamp: new Date().toISOString() }],
              },
              {
                state: 'cleared',
                messages: [{ message: 'sms2' }],
                gateway_ref: undefined,
                state_details: undefined,
                state_history: [{ state: 'cleared', state_details: undefined, timestamp: new Date().toISOString() }],
              },
            ]
          }]);
          chai.expect(db.medic.put.args[1]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);

          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);
          chai.expect(actual).to.deep.equal(responseCopy);
        });
      });

      it('should only clear pending messages', () => {
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };
        const responseCopy = Object.assign({}, response);
        db.medic.get
          .withArgs('userID').resolves({
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 123 },
          })
          .withArgs('token:login:bbb').resolves({
            _id: 'token:login:bbb',
            type: 'token_login',
            user: 'userID',
            tasks: [
              { state: 'sent', messages: [{ message: 'sms1' }] },
              { state: 'forwarded-by-gateway', messages: [{ message: 'sms2' }] },
            ]
          });
        db.users.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          token_login: {
            active: true,
            expiration_date: 123,
            token: 'bbb',
          }
        });

        db.medic.put.resolves();
        db.users.put.resolves();

        return service.manageTokenLogin({ token_login: false }, '', response).then(actual => {
          chai.expect(db.medic.put.callCount).to.equal(1);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);

          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);
          chai.expect(actual).to.deep.equal(responseCopy);
        });
      });

      it('should work when old login token doc not found', () => {
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };
        db.medic.get
          .withArgs('userID').resolves({
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 123 },
          })
          .withArgs('token:login:ccc').rejects({ status: 404 });

        db.users.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          token_login: {
            active: true,
            expiration_date: 123,
            token: 'ccc',
          }
        });

        db.medic.put.resolves();
        db.users.put.resolves();

        return service.manageTokenLogin({ token_login: false }, '', response).then(actual => {
          chai.expect(db.medic.put.callCount).to.equal(1);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);

          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          }]);
          chai.expect(actual).to.deep.equal(response);
        });
      });
    });

    describe('enabling token login', () => {
      let addMessage;

      beforeEach(() => {
        addMessage = sinon.stub();
        config.getTransitionsLib.returns({ messages: { addMessage } });
      });

      it('should generate password, token, create sms and update user docs', () => {
        config.get
          .withArgs('token_login').returns({ message: 'the sms', enabled: true })
          .withArgs('app_url').returns('http://host');
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };

        db.medic.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          phone: '+40755232323',
        });

        db.users.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
        });

        db.medic.put.resolves();
        db.users.put.resolves();
        db.medic.allDocs.resolves({ rows: [{ error: 'not_found' }] });

        clock.tick(2000);

        return service.manageTokenLogin({ token_login: true }, '', response).then(actual => {
          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0][0]).to.deep.include({
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          });
          chai.expect(db.users.put.args[0][0].token_login).to.deep.include({
            active: true,
            expiration_date: 2000 + oneDayInMS,
          });
          const token = db.users.put.args[0][0].token_login.token;

          chai.expect(db.medic.put.callCount).to.equal(2);
          const expectedDoc = {
            _id: `token:login:${token}`,
            type: 'token_login',
            reported_date: 2000,
            user: 'userID',
            tasks: []
          };
          chai.expect(db.medic.put.args[0][0]).to.deep.equal(expectedDoc);
          chai.expect(addMessage.callCount).to.equal(2);
          chai.expect(addMessage.args[0]).to.deep.equal([
            expectedDoc,
            { enabled: true, message: 'the sms' },
            '+40755232323',
            {
              templateContext: {
                _id: 'userID',
                name: 'user',
                phone: '+40755232323',
                roles: ['a', 'b']
              }
            }
          ]);
          chai.expect(addMessage.args[1]).to.deep.equal([
            expectedDoc,
            { message: `http://host/medic/login/token/${token}` },
            '+40755232323',
          ]);

          chai.expect(db.medic.put.args[1]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            phone: '+40755232323',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 2000 + oneDayInMS },
          }]);

          chai.expect(actual).to.deep.equal({
            user: { id: 'userID' },
            'user-settings': { id: 'userID' },
            token_login: { expiration_date: 2000 + oneDayInMS }
          });

          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.allDocs.args[0][0].keys[0]).to.equal(`token:login:${token}`);
        });
      });

      it('should clear previous token_login sms', () => {
        config.get
          .withArgs('token_login').returns({ message: 'the sms', enabled: true })
          .withArgs('app_url').returns('http://host');
        const response = { user: { id: 'my_user' }, 'user-settings': { id: 'my_user' } };

        db.medic.get.withArgs('my_user').resolves({
          _id: 'my_user',
          name: 'user',
          roles: ['a', 'b'],
          phone: 'phone',
          token_login: { active: true, expiration_date: 2500 },
        });
        db.medic.get.withArgs('token:login:oldtoken').resolves({
          _id: 'token:login:oldtoken',
          type: 'token_login',
          reported_date: 1000,
          user: 'my_user',
          tasks: [
            {
              state: 'pending',
              messages: [{ to: 'oldphone', message: 'old message' }],
            },
            {
              state: 'pending',
              messages: [{ to: 'oldphone', message: 'old link' }],
            },
          ],
        });

        db.users.get.withArgs('my_user').resolves({
          _id: 'my_user',
          name: 'user',
          roles: ['a', 'b'],
          token_login: {
            active: true,
            expiration_date: 2500,
            token: 'oldtoken',
          },
        });

        db.medic.put.resolves();
        db.users.put.resolves();
        db.medic.allDocs.resolves({ rows: [{ error: 'not_found' }] });

        clock.tick(2000);

        return service.manageTokenLogin({ token_login: true }, '', response).then(actual => {
          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0][0]).to.deep.include({
            _id: 'my_user',
            name: 'user',
            roles: ['a', 'b'],
          });
          chai.expect(db.users.put.args[0][0].token_login).to.deep.include({
            active: true,
            expiration_date: 2000 + oneDayInMS,
          });
          const token = db.users.put.args[0][0].token_login.token;

          chai.expect(token).not.to.equal('oldtoken');
          chai.expect(token.length).to.equal(64);

          chai.expect(db.medic.put.callCount).to.equal(3);

          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'token:login:oldtoken',
            type: 'token_login',
            reported_date: 1000,
            user: 'my_user',
            tasks: [
              {
                state: 'cleared',
                messages: [{ to: 'oldphone', message: 'old message' }],
                gateway_ref: undefined,
                state_details: undefined,
                state_history: [{ state: 'cleared', state_details: undefined, timestamp: new Date().toISOString() }]
              },
              {
                state: 'cleared',
                messages: [{ to: 'oldphone', message: 'old link' }],
                gateway_ref: undefined,
                state_details: undefined,
                state_history: [{ state: 'cleared', state_details: undefined, timestamp: new Date().toISOString() }]
              },
            ],
          }]);

          const expectedDoc = {
            _id: `token:login:${token}`,
            type: 'token_login',
            reported_date: 2000,
            user: 'my_user',
            tasks: []
          };
          chai.expect(db.medic.put.args[1][0]).to.deep.nested.equal(expectedDoc);

          chai.expect(addMessage.callCount).to.equal(2);
          chai.expect(addMessage.args[0]).to.deep.equal([
            expectedDoc,
            { enabled: true, message: 'the sms' },
            'phone',
            {
              templateContext: {
                _id: 'my_user',
                name: 'user',
                phone: 'phone',
                roles: ['a', 'b'],
                token_login: {
                  active: true,
                  expiration_date: 2500,
                  token: 'oldtoken'
                }
              }
            }
          ]);
          chai.expect(addMessage.args[1]).to.deep.equal([
            expectedDoc,
            { message: `http://host/medic/login/token/${token}` },
            'phone',
          ]);

          chai.expect(db.medic.put.args[2]).to.deep.equal([{
            _id: 'my_user',
            name: 'user',
            phone: 'phone',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 2000 + oneDayInMS },
          }]);

          chai.expect(actual).to.deep.equal({
            user: { id: 'my_user' },
            'user-settings': { id: 'my_user' },
            token_login: { expiration_date: 2000 + oneDayInMS }
          });

          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.allDocs.args[0][0].keys[0]).to.equal(`token:login:${token}`);
        });
      });

      it('should only clear pending tasks in previous token_login sms', () => {
        config.get
          .withArgs('token_login').returns({ message: 'the sms', enabled: true })
          .withArgs('app_url').returns('http://host');
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };

        db.medic.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'username',
          roles: ['a', 'b'],
          phone: 'newphone',
          token_login: { active: true, expiration_date: 2500 },
        });
        db.medic.get.withArgs('token:login:oldtoken').resolves({
          _id: 'token:login:oldtoken',
          type: 'token_login',
          reported_date: 1000,
          user: 'userID',
          tasks: [
            {
              state: 'pending',
              messages: [{ to: 'oldphone', message: 'old message' }],
            },
            {
              state: 'sent',
              messages: [{ to: 'oldphone', message: 'old link' }],
            },
          ],
        });

        db.users.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'username',
          roles: ['a', 'b'],
          token_login: {
            active: true,
            doc_id: 'oldSms',
            expiration_date: 2500,
            token: 'oldtoken',
          },
        });

        db.medic.put.resolves();
        db.users.put.resolves();
        db.medic.allDocs.resolves({ rows: [{ error: 'not_found' }] });

        clock.tick(5000);

        return service.manageTokenLogin({ token_login: true }, '', response).then(actual => {
          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0][0].token_login).to.deep.include({
            active: true,
            expiration_date: 5000 + oneDayInMS,
          });
          const token = db.users.put.args[0][0].token_login.token;

          chai.expect(db.medic.put.callCount).to.equal(3);
          chai.expect(db.medic.put.args[0]).to.deep.equal([{
            _id: 'token:login:oldtoken',
            type: 'token_login',
            reported_date: 1000,
            user: 'userID',
            tasks: [
              {
                state: 'cleared',
                messages: [{ to: 'oldphone', message: 'old message' }],
                gateway_ref: undefined,
                state_details: undefined,
                state_history: [{ state: 'cleared', state_details: undefined, timestamp: new Date().toISOString() }]
              },
              {
                state: 'sent',
                messages: [{ to: 'oldphone', message: 'old link' }],
              },
            ],
          }]);

          const expectedDoc = {
            _id: `token:login:${token}`,
            type: 'token_login',
            reported_date: 5000,
            user: 'userID',
            tasks: []
          };
          chai.expect(db.medic.put.args[1][0]).to.deep.nested.equal(expectedDoc);

          chai.expect(addMessage.callCount).to.equal(2);
          chai.expect(addMessage.args[0]).to.deep.equal([
            expectedDoc,
            { enabled: true, message: 'the sms' },
            'newphone',
            {
              templateContext: {
                _id: 'userID',
                name: 'username',
                phone: 'newphone',
                roles: ['a', 'b'],
                token_login: {
                  active: true,
                  doc_id: 'oldSms',
                  expiration_date: 2500,
                  token: 'oldtoken'
                }
              }
            }
          ]);
          chai.expect(addMessage.args[1]).to.deep.equal([
            expectedDoc,
            { message: `http://host/medic/login/token/${token}` },
            'newphone',
          ]);

          chai.expect(actual).to.deep.equal({
            user: { id: 'userID' },
            'user-settings': { id: 'userID' },
            token_login: { expiration_date: 5000 + oneDayInMS }
          });
        });
      });

      it('should try to generate a unique token', () => {
        config.get
          .withArgs('token_login').returns({ message: 'the sms', enabled: true })
          .withArgs('app_url').returns('http://host');
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };

        db.medic.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          phone: '+40755232323',
        });

        db.users.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
        });

        db.medic.put.resolves();
        db.users.put.resolves();
        db.medic.allDocs.resolves({ rows: [{}, {}, {}, { error: 'not_found' }] }); // 4th token

        clock.tick(2000);

        return service.manageTokenLogin({ token_login: true }, '', response).then(actual => {
          chai.expect(db.users.put.callCount).to.equal(1);
          chai.expect(db.users.put.args[0][0]).to.deep.include({
            _id: 'userID',
            name: 'user',
            roles: ['a', 'b'],
          });
          chai.expect(db.users.put.args[0][0].token_login).to.deep.include({
            active: true,
            expiration_date: 2000 + oneDayInMS,
          });
          const token = db.users.put.args[0][0].token_login.token;

          chai.expect(db.medic.put.callCount).to.equal(2);
          chai.expect(db.medic.put.args[0][0]).to.deep.nested.include({
            _id: `token:login:${token}`,
            type: 'token_login',
          });
          chai.expect(db.medic.put.args[1]).to.deep.equal([{
            _id: 'userID',
            name: 'user',
            phone: '+40755232323',
            roles: ['a', 'b'],
            token_login: { active: true, expiration_date: 2000 + oneDayInMS },
          }]);

          chai.expect(actual).to.deep.equal({
            user: { id: 'userID' },
            'user-settings': { id: 'userID' },
            token_login: { expiration_date: 2000 + oneDayInMS }
          });

          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.allDocs.args[0][0].keys[3]).to.equal(`token:login:${token}`);
        });
      });

      it('should throw an error when not able to generate a unique token', () => {
        config.get
          .withArgs('token_login').returns({ message: 'the sms', enabled: true })
          .withArgs('app_url').returns('http://host');
        const response = { user: { id: 'userID' }, 'user-settings': { id: 'userID' } };

        db.medic.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
          phone: '+40755232323',
        });
        db.users.get.withArgs('userID').resolves({
          _id: 'userID',
          name: 'user',
          roles: ['a', 'b'],
        });

        db.medic.allDocs.resolves({ rows: [] });

        clock.tick(2000);

        return service
          .manageTokenLogin({ token_login: true }, '', response)
          .then(() => chai.assert.fail('Should have thrown'))
          .catch(err => {
            chai.expect(err.message).to.equal('Failed to generate unique token');
          });
      });
    });
  });

});
