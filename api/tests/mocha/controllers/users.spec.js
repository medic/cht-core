const sinon = require('sinon');
const chai = require('chai');
const controller = require('../../../src/controllers/users');
const auth = require('../../../src/auth');
const authorization = require('../../../src/services/authorization');
const serverUtils = require('../../../src/server-utils');
const purgedDocs = require('../../../src/services/purged-docs');
const config = require('../../../src/config');
const db = require('../../../src/db');
const dataContext = require('../../../src/services/data-context');
const { roles, users } = require('@medic/user-management')(config, db, dataContext);
const replicationLimitLog = require('../../../src/services/replication-limit-log');

let req;
let userCtx;
let res;

describe('Users Controller', () => {
  beforeEach(() => {
    req = {};
    res = {};
    sinon.stub(authorization, 'getAuthorizationContext');
    sinon.stub(authorization, 'getDocsByReplicationKey');
    sinon.stub(authorization, 'filterAllowedDocIds');

    sinon.stub(roles, 'isOnlineOnly');
    sinon.stub(roles, 'hasOnlineRole');
    sinon.stub(auth, 'hasAllPermissions');
    sinon.stub(serverUtils, 'error');
    sinon.stub(db.medic, 'info').resolves({ update_seq: 123 });
  });
  afterEach(() => sinon.restore());

  describe('get single user', () => {
    const userContext = Object.freeze({ name: 'medic' });

    beforeEach(() => {
      sinon.stub(auth, 'getUserCtx').resolves(userContext);
      auth.hasAllPermissions.returns(true);
      sinon.stub(auth, 'basicAuthCredentials');
      sinon.stub(users, 'getUser');
      res = { json: sinon.stub() };
    });

    it('returns a user', async () => {
      const expectedUser = {
        id: 'org.couchdb.user:chw',
        roles: ['chw', 'district-admin'],
        contact: {
          _id: 'chw-contact',
          parent: { _id: 'chw-facility' },
        }
      };
      users.getUser.resolves(expectedUser);
      req = { params: { username: 'chw' } };

      await controller.v2.get(req, res);

      chai.expect(auth.getUserCtx.calledOnce).to.be.true;
      chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
      chai.expect(auth.hasAllPermissions.calledOnce).to.be.true;
      chai.expect(auth.hasAllPermissions.args[0]).to.deep.equal([userContext, 'can_view_users']);
      chai.expect(auth.basicAuthCredentials.notCalled).to.be.true;
      chai.expect(users.getUser.calledOnce).to.be.true;
      chai.expect(users.getUser.args[0]).to.deep.equal([req.params.username]);
      chai.expect(res.json.calledOnce).to.be.true;
      chai.expect(res.json.args[0]).to.deep.equal([expectedUser]);
    });

    it('returns user when user does not have permission but is referencing self', async () => {
      auth.hasAllPermissions.returns(false);
      const userCtx = { name: 'chw' };
      auth.getUserCtx.resolves({ name: 'chw' });
      const expectedUser = {
        id: 'org.couchdb.user:chw',
        roles: ['chw', 'district-admin'],
        contact: {
          _id: 'chw-contact',
          parent: { _id: 'chw-facility' },
        }
      };
      users.getUser.resolves(expectedUser);
      req = { params: { username: 'chw' } };

      await controller.v2.get(req, res);

      chai.expect(auth.getUserCtx.calledOnce).to.be.true;
      chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
      chai.expect(auth.hasAllPermissions.calledOnce).to.be.true;
      chai.expect(auth.hasAllPermissions.args[0]).to.deep.equal([userCtx, 'can_view_users']);
      chai.expect(auth.basicAuthCredentials.calledOnce).to.be.true;
      chai.expect(auth.basicAuthCredentials.args[0]).to.deep.equal([req]);
      chai.expect(users.getUser.calledOnce).to.be.true;
      chai.expect(users.getUser.args[0]).to.deep.equal([req.params.username]);
      chai.expect(res.json.calledOnce).to.be.true;
      chai.expect(res.json.args[0]).to.deep.equal([expectedUser]);
    });

    it('returns user when user does not have permission but is referencing self with basic auth', async () => {
      auth.hasAllPermissions.returns(false);
      auth.basicAuthCredentials.returns({ username: 'chw' });
      const userCtx = { name: 'chw' };
      auth.getUserCtx.resolves(userCtx);
      const expectedUser = {
        id: 'org.couchdb.user:chw',
        roles: ['chw', 'district-admin'],
        contact: {
          _id: 'chw-contact',
          parent: { _id: 'chw-facility' },
        }
      };
      users.getUser.resolves(expectedUser);
      req = { params: { username: 'chw' } };

      await controller.v2.get(req, res);

      chai.expect(auth.getUserCtx.calledOnce).to.be.true;
      chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
      chai.expect(auth.hasAllPermissions.calledOnce).to.be.true;
      chai.expect(auth.hasAllPermissions.args[0]).to.deep.equal([userCtx, 'can_view_users']);
      chai.expect(auth.basicAuthCredentials.calledOnce).to.be.true;
      chai.expect(auth.basicAuthCredentials.args[0]).to.deep.equal([req]);
      chai.expect(users.getUser.calledOnce).to.be.true;
      chai.expect(users.getUser.args[0]).to.deep.equal([req.params.username]);
      chai.expect(res.json.calledOnce).to.be.true;
      chai.expect(res.json.args[0]).to.deep.equal([expectedUser]);
    });

    it('returns error when user does not have permission and is not referencing self', async () => {
      auth.hasAllPermissions.returns(false);
      req = { params: { username: 'chw' } };

      await controller.v2.get(req, res);

      chai.expect(auth.getUserCtx.calledOnce).to.be.true;
      chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
      chai.expect(auth.hasAllPermissions.calledOnce).to.be.true;
      chai.expect(auth.hasAllPermissions.args[0]).to.deep.equal([userContext, 'can_view_users']);
      chai.expect(auth.basicAuthCredentials.calledOnce).to.be.true;
      chai.expect(auth.basicAuthCredentials.args[0]).to.deep.equal([req]);
      chai.expect(users.getUser.notCalled).to.be.true;
      chai.expect(res.json.notCalled).to.be.true;
      chai.expect(serverUtils.error.calledOnce).to.be.true;
      const expectedError = { message: 'Insufficient privileges', code: 403 };
      chai.expect(serverUtils.error.args[0]).to.deep.equal([expectedError, req, res]);
    });

    it('returns error when user does not have permission and conflicting basic auth and session cookie', async () => {
      auth.hasAllPermissions.returns(false);
      // If a request has both basic auth and a session cookie, they should always match. But it is possible for a
      // mismatched cookie to be sent with the request. In this case, we check both to see if user is referencing self.
      auth.basicAuthCredentials.returns({ username: 'medic' });
      const userCtx = { name: 'chw' };
      auth.getUserCtx.resolves(userCtx);
      req = { params: { username: 'chw' } };

      await controller.v2.get(req, res);

      chai.expect(auth.getUserCtx.calledOnce).to.be.true;
      chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
      chai.expect(auth.hasAllPermissions.calledOnce).to.be.true;
      chai.expect(auth.hasAllPermissions.args[0]).to.deep.equal([userCtx, 'can_view_users']);
      chai.expect(auth.basicAuthCredentials.calledOnce).to.be.true;
      chai.expect(auth.basicAuthCredentials.args[0]).to.deep.equal([req]);
      chai.expect(users.getUser.notCalled).to.be.true;
      chai.expect(res.json.notCalled).to.be.true;
      chai.expect(serverUtils.error.calledOnce).to.be.true;
      const expectedError = { message: 'Insufficient privileges', code: 403 };
      chai.expect(serverUtils.error.args[0]).to.deep.equal([expectedError, req, res]);
    });

    it('returns an error when retrieving user fails', async () => {
      const expectedError = new Error('Could not find user.');
      users.getUser.rejects(expectedError);
      req = { params: { username: 'chw' } };

      await controller.v2.get(req, res);

      chai.expect(auth.getUserCtx.calledOnce).to.be.true;
      chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
      chai.expect(auth.hasAllPermissions.calledOnce).to.be.true;
      chai.expect(auth.hasAllPermissions.args[0]).to.deep.equal([userContext, 'can_view_users']);
      chai.expect(auth.basicAuthCredentials.notCalled).to.be.true;
      chai.expect(users.getUser.calledOnce).to.be.true;
      chai.expect(users.getUser.args[0]).to.deep.equal([req.params.username]);
      chai.expect(res.json.notCalled).to.be.true;
      chai.expect(serverUtils.error.calledOnce).to.be.true;
      chai.expect(serverUtils.error.args[0]).to.deep.equal([expectedError, req, res]);
    });
  });

  describe('get users list', () => {
    let userList;

    beforeEach(() => {
      userList = [
        { id: 'org.couchdb.user:admin', roles: ['_admin'] },
        {
          id: 'org.couchdb.user:chw',
          roles: ['chw', 'district-admin'],
          contact: {
            _id: 'chw-contact',
            parent: { _id: 'chw-facility' },
          }
        },
        { id: 'org.couchdb.user:unknown' },
      ];
      req = { };
      res = { json: sinon.stub() };
      sinon.stub(users, 'getList').resolves(userList);
    });

    describe('v1', () => {

      it('rejects if not permitted', async () => {
        sinon.stub(auth, 'check').rejects(new Error('nope'));
        await controller.list(req, res);
        chai.expect(serverUtils.error.callCount).to.equal(1);
      });

      it('gets the list of users', async () => {
        sinon.stub(auth, 'check').resolves();

        await controller.list(req, res);
        const result = res.json.args[0][0];
        chai.expect(result[0].id).to.equal('org.couchdb.user:admin');
        chai.expect(result[0].type).to.equal('_admin');
        chai.expect(result[0].roles).to.be.undefined;
        chai.expect(result[1].id).to.equal('org.couchdb.user:chw');
        chai.expect(result[1].type).to.deep.equal('chw');
        chai.expect(result[1].roles).to.be.undefined;
        chai.expect(result[2].id).to.equal('org.couchdb.user:unknown');
        chai.expect(result[2].type).to.deep.equal('unknown');
        chai.expect(result[2].roles).to.be.undefined;
      });

    });

    describe('v2', () => {
      it('rejects if not permitted', async () => {
        sinon.stub(auth, 'check').rejects(new Error('nope'));
        await controller.v2.list(req, res);
        chai.expect(serverUtils.error.callCount).to.equal(1);
      });

      it('gets the list of users without filters', async () => {
        sinon.stub(auth, 'check').resolves();

        await controller.v2.list(req, res);
        const result = res.json.args[0][0];
        chai.expect(result[0].id).to.equal('org.couchdb.user:admin');
        chai.expect(result[0].type).to.be.undefined;
        chai.expect(result[0].roles).to.deep.equal([ '_admin' ]);
        chai.expect(result[1].id).to.equal('org.couchdb.user:chw');
        chai.expect(result[1].type).to.be.undefined;
        chai.expect(result[1].roles).to.deep.equal([ 'chw', 'district-admin' ]);
        chai.expect(result[2].id).to.equal('org.couchdb.user:unknown');
        chai.expect(result[2].type).to.be.undefined;
        chai.expect(result[2].roles).to.be.undefined;
      });

      it('gets the list of users with facility_id filter', async () => {
        sinon.stub(auth, 'check').resolves();
        users.getList.resolves([userList[1]]);
        req.query = {
          facility_id: 'chw-facility',
          unsupported: 'nope',
          contactId: 'not supported either',
          this_wont_work: 123,
        };

        await controller.v2.list(req, res);
        chai.expect(users.getList.firstCall.args[0])
          .to.deep.equal({ facilityId: 'chw-facility', contactId: undefined });
        const result = res.json.args[0][0];
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].id).to.equal('org.couchdb.user:chw');
        chai.expect(result[0].type).to.be.undefined;
        chai.expect(result[0].roles).to.deep.equal(['chw', 'district-admin']);
        chai.expect(result[0].contact._id).to.equal('chw-contact');
        chai.expect(result[0].contact.parent._id).to.equal('chw-facility');
      });

      it('gets the list of users with facility_id and contact_id filters', async () => {
        sinon.stub(auth, 'check').resolves();
        users.getList.resolves([userList[1]]);
        req.query = { facility_id: 'chw-facility', contact_id: 'chw-contact' };

        await controller.v2.list(req, res);
        chai.expect(users.getList.firstCall.args[0]).to.deep.equal({
          contactId: 'chw-contact',
          facilityId: 'chw-facility',
        });
        const result = res.json.args[0][0];
        chai.expect(result.length).to.equal(1);
        chai.expect(result[0].id).to.equal('org.couchdb.user:chw');
        chai.expect(result[0].type).to.be.undefined;
        chai.expect(result[0].roles).to.deep.equal(['chw', 'district-admin']);
        chai.expect(result[0].contact._id).to.equal('chw-contact');
        chai.expect(result[0].contact.parent._id).to.equal('chw-facility');
      });

      it('gets the list of users and ignores unexpected filters', async () => {
        sinon.stub(auth, 'check').resolves();
        req.query = { roles: ['chw'], name: 'admin' };

        await controller.v2.list(req, res);
        chai.expect(users.getList.firstCall.args[0]).to.deep.equal({ facilityId: undefined, contactId: undefined });
        const result = res.json.args[0][0];
        chai.expect(result.length).to.equal(3);
        chai.expect(result[0].id).to.equal('org.couchdb.user:admin');
        chai.expect(result[1].id).to.equal('org.couchdb.user:chw');
        chai.expect(result[2].id).to.equal('org.couchdb.user:unknown');
      });
    });

  });

  describe('info', () => {
    beforeEach(() => {
      userCtx = { name: 'user', roles: ['admin'] };
      req = { query: {}, userCtx };
      res = { json: sinon.stub() };
    });

    it('should catch auth context errors', () => {
      serverUtils.error.resolves();
      authorization.getAuthorizationContext.rejects({ some: 'err' });
      return controller.info(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res]);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
        chai.expect(authorization.getDocsByReplicationKey.callCount).to.equal(0);
      });
    });

    it('should catch auth ids errors', () => {
      serverUtils.error.resolves();
      authorization.getAuthorizationContext.resolves({});
      authorization.getDocsByReplicationKey.rejects({ some: 'other err' });
      sinon.stub(purgedDocs, 'getUnPurgedIds');
      return controller.info(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'other err' }, req, res]);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
        chai.expect(authorization.getDocsByReplicationKey.callCount).to.equal(1);
        chai.expect(purgedDocs.getUnPurgedIds.callCount).to.equal(0);
      });
    });

    it('should catch purge ids errors', () => {
      serverUtils.error.resolves();
      authorization.getAuthorizationContext.resolves({});
      authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key' });
      sinon.stub(purgedDocs, 'getUnPurgedIds').rejects({ some: 'err' });
      return controller.info(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res]);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
        chai.expect(authorization.getDocsByReplicationKey.callCount).to.equal(1);
        chai.expect(purgedDocs.getUnPurgedIds.callCount).to.equal(1);
      });
    });

    describe('online users', () => {
      beforeEach(() => {
        roles.isOnlineOnly.returns(true);
      });

      it('should respond with error when user does not have required permissions', () => {
        serverUtils.error.resolves();
        auth.hasAllPermissions.returns(false);
        return controller.info(req, res).then(() => {
          chai.expect(auth.hasAllPermissions.callCount).to.equal(1);
          chai.expect(auth.hasAllPermissions.args[0]).to.deep.equal([userCtx, 'can_update_users']);
          chai.expect(serverUtils.error.args[0])
            .to.deep.equal([{ code: 403, reason: 'Insufficient privileges' }, req, res]);
          chai.expect(res.json.callCount).to.equal(0);
          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(0);
          chai.expect(serverUtils.error.callCount).to.equal(1);
        });
      });

      it('should respond with error when neither role and facility_id are provided', () => {
        serverUtils.error.resolves();
        auth.hasAllPermissions.returns(true);
        return controller.info(req, res).then(() => {
          chai.expect(auth.hasAllPermissions.callCount).to.equal(1);
          chai.expect(auth.hasAllPermissions.args[0]).to.deep.equal([userCtx, 'can_update_users']);
          chai.expect(serverUtils.error.args[0])
            .to.deep.equal([{ code: 400, reason: 'Missing required query params: role and/or facility_id' }, req, res]);
          chai.expect(res.json.callCount).to.equal(0);
          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(0);
          chai.expect(serverUtils.error.callCount).to.equal(1);
        });
      });

      it('should respond with error when role is provided without facility_id', () => {
        serverUtils.error.resolves();
        req.query.role = 'some_role';
        auth.hasAllPermissions.returns(true);
        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0])
            .to.deep.equal([{ code: 400, reason: 'Missing required query params: role and/or facility_id' }, req, res]);
        });
      });

      it('should respond with error when facility_id is provided without role', () => {
        serverUtils.error.resolves();
        req.query.facility_id = 'some_facility_id';
        auth.hasAllPermissions.returns(true);
        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0])
            .to.deep.equal([{ code: 400, reason: 'Missing required query params: role and/or facility_id' }, req, res]);
        });
      });

      it('should respond with error when provided role is not offline', () => {
        serverUtils.error.resolves();
        req.query = {
          role: 'some_role',
          facility_id: 'some_facility_id'
        };
        roles.isOnlineOnly.returns(true);
        roles.hasOnlineRole.returns(true);
        auth.hasAllPermissions.returns(true);
        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0])
            .to.deep.equal([{ code: 400, reason: 'Provided role is not offline' }, req, res]);
          chai.expect(roles.hasOnlineRole.callCount).to.equal(1);
          chai.expect(roles.hasOnlineRole.args[0]).to.deep.equal([['some_role']]);
        });
      });

      it('should query authorization with context corresponding to requested data', () => {
        req.query = {
          role: 'some_role',
          facility_id: 'some_facility_id'
        };
        roles.isOnlineOnly.returns(true);
        roles.hasOnlineRole.returns(false);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: ['some_role'], facility_id: [req.query.facility_id] },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = ['some_facility_id', 'a', 'b', 'c', '1', '2', '3', 'task1', 'task2'];
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
        authorization.filterAllowedDocIds
          .onCall(0).returns(docIds)
          .onCall(1).returns(['some_facility_id', 'a', 'b', 'c', '1', '2', '3']);

        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([{
            roles: ['some_role'],
            facility_id: [req.query.facility_id],
            contact_id: undefined
          }]);
          chai.expect(authorization.getDocsByReplicationKey.callCount).to.equal(1);
          chai.expect(authorization.getDocsByReplicationKey.args[0]).to.deep.equal([ authContext ]);
          chai.expect(authorization.filterAllowedDocIds.callCount).to.equal(2);
          chai.expect(authorization.filterAllowedDocIds.args[0]).to.deep.equal([
            authContext,
            { docs: 'by replication key'},
          ]);
          chai.expect(authorization.filterAllowedDocIds.args[1]).to.deep.equal([
            authContext,
            { docs: 'by replication key'},
            { includeTasks: false },
          ]);
          chai.expect(purgedDocs.getUnPurgedIds.callCount).to.equal(1);
          chai.expect(purgedDocs.getUnPurgedIds.args[0]).to.deep.equal([
            { ...authContext.userCtx, contact_id: undefined },
            docIds,
          ]);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 9, warn_docs: 7, warn: false, limit: 10000 }]);

          chai.expect(roles.isOnlineOnly.callCount).to.equal(1);
          chai.expect(roles.isOnlineOnly.args[0]).to.deep.equal([userCtx]);
          chai.expect(roles.hasOnlineRole.callCount).to.equal(1);
          chai.expect(roles.hasOnlineRole.args[0]).to.deep.equal([['some_role']]);
        });
      });

      it('should use contact_id if provided', () => {
        req.query = {
          role: 'some_role',
          facility_id: 'some_facility_id',
          contact_id: 'some_contact_id'
        };
        roles.isOnlineOnly.returns(true);
        roles.hasOnlineRole.returns(false);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: ['some_role'], facility_id: req.query.facility_id, contact_id: 'some_contact_id' },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = ['some_facility_id', 'a', 'b', 'c', '1', '2', '3', 'task1', 'task2'];
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
        authorization.filterAllowedDocIds
          .onCall(0).returns(docIds)
          .onCall(1).returns(['some_facility_id', 'a', 'b', 'c', '1', '2', '3']);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([{
            roles: ['some_role'],
            facility_id: [req.query.facility_id],
            contact_id: req.query.contact_id
          }]);
          chai.expect(authorization.getDocsByReplicationKey.callCount).to.equal(1);
          chai.expect(authorization.getDocsByReplicationKey.args[0]).to.deep.equal([authContext]);

          chai.expect(authorization.filterAllowedDocIds.callCount).to.equal(2);
          chai.expect(authorization.filterAllowedDocIds.args[0]).to.deep.equal([
            authContext,
            { docs: 'by replication key'},
          ]);
          chai.expect(authorization.filterAllowedDocIds.args[1]).to.deep.equal([
            authContext,
            { docs: 'by replication key'},
            { includeTasks: false },
          ]);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 9, warn_docs: 7, warn: false, limit: 10000 }]);
        });
      });

      it('should return warning when resulting doc ids length exceeds recommended limit', () => {
        req.query = {
          role: 'some_role',
          facility_id: 'some_facility_id'
        };
        roles.isOnlineOnly.returns(true);
        roles.hasOnlineRole.returns(false);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: ['some_role'], facility_id: req.query.facility_id },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(15000), (x, idx) => idx + 1);
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
        authorization.filterAllowedDocIds
          .onCall(0).returns(docIds)
          .onCall(1).returns(docIds.slice(0, 10200));
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{
            total_docs: 15000,
            warn_docs: 10200,
            warn: true,
            limit: 10000
          }]);
        });
      });

      it('should only count non-task documents towards the warning', () => {
        req.query = {
          role: 'some_role',
          facility_id: 'some_facility_id'
        };
        roles.isOnlineOnly.returns(false);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: ['some_role'], facility_id: req.query.facility_id },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(15000), (x, idx) => idx + 1);
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
        authorization.filterAllowedDocIds
          .onCall(0).returns(docIds)
          .onCall(1).returns(docIds.slice(0, 9800));
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);
        sinon.stub(replicationLimitLog, 'put');

        return controller.info(req, res).then(() => {
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{
            total_docs: 15000,
            warn_docs: 9800,
            warn: false,
            limit: 10000
          }]);
        });
      });

      it('should only count unpurged docs', () => {
        req.query = {
          role: 'some_role',
          facility_id: 'some_facility_id'
        };
        roles.isOnlineOnly.returns(true);
        roles.hasOnlineRole.returns(false);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: [req.query.role], facility_id: req.query.facility_id },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(10500), (x, idx) => idx + 1);
        const unpurgedIds = docIds.slice(0, 8000);
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
        authorization.filterAllowedDocIds
          .onCall(0).returns(docIds)
          .onCall(1).returns(docIds.slice(0, 9800));
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(unpurgedIds);
        sinon.stub(replicationLimitLog, 'put');

        return controller.info(req, res).then(() => {
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{
            total_docs: unpurgedIds.length,
            warn_docs: unpurgedIds.length,
            warn: false,
            limit: 10000
          }]);
        });
      });

      it('should parse role json and use all provided roles', () => {
        req.query = {
          role: JSON.stringify(['role1', 'role2']),
          facility_id: 'some_facility_id'
        };
        roles.isOnlineOnly.returns(true);
        roles.hasOnlineRole.returns(false);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: ['role1', 'role2'], facility_id: [req.query.facility_id ]},
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(1000), (x, idx) => idx + 1);
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
        authorization.filterAllowedDocIds.returns(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);
        sinon.stub(replicationLimitLog, 'put');

        return controller.info(req, res).then(() => {
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([{
            roles: ['role1', 'role2'],
            facility_id: ['some_facility_id'],
            contact_id: undefined,
          }]);
          chai.expect(purgedDocs.getUnPurgedIds.callCount).to.equal(1);
          chai.expect(purgedDocs.getUnPurgedIds.args[0]).to.deep.equal([
            { ...authContext.userCtx, contact_id: undefined },
            docIds,
          ]);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{
            total_docs: 1000,
            warn_docs: 1000,
            warn: false,
            limit: 10000,
          }]);

          chai.expect(roles.isOnlineOnly.callCount).to.equal(1);
          chai.expect(roles.isOnlineOnly.args[0]).to.deep.equal([userCtx]);
          chai.expect(roles.hasOnlineRole.callCount).to.equal(1);
          chai.expect(roles.hasOnlineRole.args[0]).to.deep.equal([['role1', 'role2']]);
        });
      });

      describe('roles scenarios', () => {
        const expected = { total_docs: 3, warn_docs: 3, warn: false, limit: 10000 };
        const scenarios = [
          { role: 'aaaa', name: 'string single role' },
          { role: JSON.stringify('aaaa'), name: 'json single role' },
          { role: JSON.stringify(['1', '2', '3']), name: 'array of string roles works'},
          { role: JSON.stringify(['1', '2']).slice(0, -2), name: 'malformed json = param treated as string'},
          { role: JSON.stringify({ not: 'an array' }), fail: true, name: 'JSON object' },
          { role: JSON.stringify(['1', { not: 'a string' }]), fail: true, name: 'JSON array with objects' },
          { role: JSON.stringify(['1', 32, '2']), fail: true, name: 'JSON array with numbers' },
          { role: JSON.stringify(['1', undefined, '2']), fail: true, name: 'JSON array with undefined' },
          { role: JSON.stringify(['1', null, '2']), fail: true, name: 'JSON array with undefined' },
          { role: JSON.stringify(['1', true, '2']), fail: true, name: 'JSON array with boolean' },
        ];

        beforeEach(() => {
          authorization.getAuthorizationContext.callsFake(userCtx => Promise.resolve({ userCtx }));
          authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
          authorization.filterAllowedDocIds.returns(['1', '2', '3']);
          sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(['1', '2', '3']);
          roles.isOnlineOnly.returns(true);
          roles.hasOnlineRole.returns(false);
          auth.hasAllPermissions.returns(true);
          serverUtils.error.resolves();
          sinon.stub(replicationLimitLog, 'put');
        });

        scenarios.forEach(scenario => {
          it(scenario.name, () => {
            req.query = {
              role: scenario.role,
              facility_id: 'some_facility_id'
            };
            return controller.info(req, res).then(() => {
              if (scenario.fail) {
                chai.expect(serverUtils.error.callCount).to.equal(1);
                chai.expect(serverUtils.error.args[0][0].code).to.deep.equal(400);
                chai.expect(res.json.callCount).to.equal(0);
              } else {
                chai.expect(serverUtils.error.callCount).to.equal(0);
                chai.expect(res.json.callCount).to.equal(1);
                chai.expect(res.json.args[0]).to.deep.equal([expected]);
              }
            });
          });
        });
      });
    });

    describe('offline users', () => {
      beforeEach(() => {
        userCtx = { name: 'user', roles: ['offline'], facility_id: 'some_facility_id' };
        req = { userCtx };
        res = { json: sinon.stub() };
        roles.isOnlineOnly.returns(false);
      });

      it('should query authorization with correct context', () => {
        const authContext = {
          userCtx,
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(8000), (x, idx) => idx + 1);

        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
        authorization.filterAllowedDocIds.returns(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);
        sinon.stub(replicationLimitLog, 'put');

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{
            total_docs: 8000,
            warn_docs: 8000,
            warn: false,
            limit: 10000,
          }]);

          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([userCtx]);
          chai.expect(authorization.getDocsByReplicationKey.callCount).to.equal(1);
          chai.expect(authorization.getDocsByReplicationKey.args[0]).to.deep.equal([authContext]);
          chai.expect(authorization.filterAllowedDocIds.callCount).to.equal(2);
          chai.expect(authorization.filterAllowedDocIds.args[0]).to.deep.equal([
            authContext,
            { docs: 'by replication key' },
          ]);
          chai.expect(authorization.filterAllowedDocIds.args[1]).to.deep.equal([
            authContext,
            { docs: 'by replication key' },
            { includeTasks: false }
          ]);
          chai.expect(purgedDocs.getUnPurgedIds.callCount).to.equal(1);
          chai.expect(purgedDocs.getUnPurgedIds.args[0]).to.deep.equal([userCtx, docIds]);
        });
      });

      it('should return correct warn value when over 10000 docs', () => {
        const authContext = {
          userCtx,
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(15000), (x, idx) => idx + 1);

        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
        authorization.filterAllowedDocIds
          .onCall(0).returns(docIds)
          .onCall(1).returns(docIds.slice(0, 11000));
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);
        sinon.stub(replicationLimitLog, 'put');

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{
            total_docs: 15000,
            warn_docs: 11000,
            warn: true,
            limit: 10000,
          }]);
        });
      });

      it('should only count non-task docs towards warning', () => {
        const authContext = {
          userCtx,
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(15000), (x, idx) => idx + 1);

        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
        authorization.filterAllowedDocIds
          .onCall(0).returns(docIds)
          .onCall(1).returns(docIds.slice(0, 9600));
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);
        sinon.stub(replicationLimitLog, 'put');

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{
            total_docs: docIds.length,
            warn_docs: 9600,
            warn: false,
            limit: 10000,
          }]);
        });
      });

      it('should only count unpurged docs', () => {
        const authContext = {
          userCtx,
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(10500), (x, idx) => idx + 1);
        const unpurgedIds = docIds.slice(0, 9500);

        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
        authorization.filterAllowedDocIds.returns(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(unpurgedIds);
        sinon.stub(replicationLimitLog, 'put');

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{
            total_docs: unpurgedIds.length,
            warn_docs: unpurgedIds.length,
            warn: false,
            limit: 10000,
          }]);
        });
      });
    });

    it('should intersect purged results correctly', () => {
      const authContext = {
        userCtx,
        contactsByDepthKeys: [['some_facility_id']],
        subjectIds: ['some_facility_id', 'a', 'b', 'c']
      };

      const allDocIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const warnDocIds = [1, 2, 3, 4, 5];
      const unpurgedIds = [2, 4, 6, 9, 10];

      authorization.getAuthorizationContext.resolves(authContext);
      authorization.getDocsByReplicationKey.resolves({ docs: 'by replication key'});
      authorization.filterAllowedDocIds
        .onCall(0).returns(allDocIds)
        .onCall(1).returns(warnDocIds);
      sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(unpurgedIds);
      sinon.stub(replicationLimitLog, 'put');

      return controller.info(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{
          total_docs: 5, // 2, 4, 6, 9, 10
          warn_docs: 2, // 2, 4
          warn: false,
          limit: 10000,
        }]);
      });
    });
  });

  describe('create', () => {
    it('should respond with error when requester has no permission', () => {
      sinon.stub(auth, 'check').rejects({ status: 403 });
      return controller.create(req, res).then(() => {
        chai.expect(auth.check.callCount).to.equal(1);
        chai.expect(auth.check.args[0]).to.deep.equal([req, ['can_edit', 'can_create_users']]);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ status: 403 }, req, res]);
      });
    });

    it('should respond with error when creating fails', () => {
      sinon.stub(auth, 'check').resolves();
      sinon.stub(users, 'createUser').rejects({ some: 'err' });
      req = { protocol: 'http', hostname: 'thehost.com', body: { name: 'user' } };
      res = { json: sinon.stub() };
      return controller.create(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res]);
        chai.expect(users.createUser.callCount).to.equal(1);
        chai.expect(users.createUser.args[0]).to.deep.equal([req.body, 'http://thehost.com']);
        chai.expect(res.json.callCount).to.equal(0);

      });
    });

    it('should create the user and respond', () => {
      sinon.stub(auth, 'check').resolves();
      sinon.stub(users, 'createUser').resolves({ user: { id: 'aaa' } });
      req = { protocol: 'https', hostname: 'host.com', body: { name: 'user' } };
      res = { json: sinon.stub() };
      return controller.create(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(0);
        chai.expect(users.createUser.callCount).to.equal(1);
        chai.expect(users.createUser.args[0]).to.deep.equal([req.body, 'https://host.com']);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ user: { id: 'aaa' } }]);
      });
    });
  });

  describe('update', () => {
    it('should respond with error when empty body', () => {
      req.body = {};
      // this is probably not a promise, but we make it a promise so we can make certain we're testing the whole thing
      sinon.stub(serverUtils, 'emptyJSONBodyError').resolves();
      return controller.update(req, res).then(() => {
        chai.expect(serverUtils.emptyJSONBodyError.callCount).to.equal(1);
      });
    });

    it('should respond with error when not permitted', () => {
      sinon.stub(auth, 'check').rejects({ code: 403 });
      sinon.stub(auth, 'getUserCtx').resolves({ name: 'alpha' });
      sinon.stub(auth, 'basicAuthCredentials').returns({ name: 'alpha' });
      sinon.stub(auth, 'validateBasicAuth').resolves();
      req = { params: { username: 'beta' }, body: { field: 'update' } };

      return controller.update(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([
          { code: 403, message: 'You do not have permissions to modify this person' },
          req,
          res,
        ]);
        chai.expect(auth.check.callCount).to.equal(1);
        chai.expect(auth.check.args[0]).to.deep.equal([req, ['can_edit', 'can_update_users']]);
        chai.expect(auth.getUserCtx.callCount).to.equal(1);
      });
    });

    it('should allow user to update himself', () => {
      sinon.stub(auth, 'check').rejects({ code: 403 });
      sinon.stub(auth, 'getUserCtx').resolves({ name: 'alpha' });
      sinon.stub(auth, 'basicAuthCredentials').returns({ username: 'alpha' });
      sinon.stub(auth, 'validateBasicAuth').resolves();
      req = { params: { username: 'alpha' }, protocol: 'http', hostname: 'myhost.net', body: { field: 'update' } };
      res = { json: sinon.stub() };
      sinon.stub(users, 'updateUser').resolves({ response: true });

      return controller.update(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(0);
        chai.expect(users.updateUser.callCount).to.equal(1);
        chai.expect(users.updateUser.args[0]).to.deep.equal(['alpha', { field: 'update' }, false, 'http://myhost.net']);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ response: true }]);
      });
    });

    it('should allow admins to update other users', () => {
      sinon.stub(auth, 'check').resolves();
      sinon.stub(auth, 'getUserCtx').resolves({ name: 'alpha' });
      sinon.stub(auth, 'basicAuthCredentials').returns({ username: 'alpha' });
      sinon.stub(auth, 'validateBasicAuth').resolves();
      req = { params: { username: 'beta' }, protocol: 'https', hostname: 'myhost.io', body: { field: 'update' } };
      res = { json: sinon.stub() };
      sinon.stub(users, 'updateUser').resolves({ updated: true });

      return controller.update(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(0);
        chai.expect(users.updateUser.callCount).to.equal(1);
        chai.expect(users.updateUser.args[0]).to.deep.equal(['beta', { field: 'update' }, true, 'https://myhost.io']);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ updated: true }]);
      });
    });
  });
});
