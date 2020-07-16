const sinon = require('sinon');
const chai = require('chai');
const controller = require('../../../src/controllers/users');
const auth = require('../../../src/auth');
const authorization = require('../../../src/services/authorization');
const serverUtils = require('../../../src/server-utils');
const purgedDocs = require('../../../src/services/purged-docs');
const users = require('../../../src/services/users');

let req;
let userCtx;
let res;

describe('Users Controller', () => {
  beforeEach(() => {
    req = {};
    res = {};
    sinon.stub(authorization, 'getAuthorizationContext');
    sinon.stub(authorization, 'getAllowedDocIds');
    sinon.stub(auth, 'isOnlineOnly');
    sinon.stub(auth, 'isOffline');
    sinon.stub(auth, 'hasAllPermissions');
    sinon.stub(serverUtils, 'error');
  });
  afterEach(() => sinon.restore());

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
        chai.expect(authorization.getAllowedDocIds.callCount).to.equal(0);
      });
    });

    it('should catch auth ids errors', () => {
      serverUtils.error.resolves();
      authorization.getAuthorizationContext.resolves({});
      authorization.getAllowedDocIds.rejects({ some: 'other err' });
      sinon.stub(purgedDocs, 'getUnPurgedIds');
      return controller.info(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'other err' }, req, res]);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
        chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
        chai.expect(purgedDocs.getUnPurgedIds.callCount).to.equal(0);
      });
    });

    it('should catch purge ids errors', () => {
      serverUtils.error.resolves();
      authorization.getAuthorizationContext.resolves({});
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      sinon.stub(purgedDocs, 'getUnPurgedIds').rejects({ some: 'err' });
      return controller.info(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res]);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
        chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
        chai.expect(purgedDocs.getUnPurgedIds.callCount).to.equal(1);
      });
    });

    describe('online users', () => {
      beforeEach(() => {
        auth.isOnlineOnly.returns(true);
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
        auth.isOffline.returns(false);
        auth.hasAllPermissions.returns(true);
        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0])
            .to.deep.equal([{ code: 400, reason: 'Provided role is not offline' }, req, res]);
        });
      });

      it('should query authorization with context corresponding to requested data', () => {
        req.query = {
          role: 'some_role',
          facility_id: 'some_facility_id'
        };
        auth.isOffline.returns(true);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: ['some_role'], facility_id: req.query.facility_id },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = ['some_facility_id', 'a', 'b', 'c', '1', '2', '3'];
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([{
            roles: ['some_role'],
            facility_id: req.query.facility_id,
            contact_id: undefined
          }]);
          chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
          chai.expect(authorization.getAllowedDocIds.args[0])
            .to.deep.equal([authContext, { includeTombstones: false }]);
          chai.expect(purgedDocs.getUnPurgedIds.callCount).to.equal(1);
          chai.expect(purgedDocs.getUnPurgedIds.args[0]).to.deep.equal([['some_role'], docIds]);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 7, warn: false, limit: 10000 }]);
        });
      });

      it('should use contact_id if provided', () => {
        req.query = {
          role: 'some_role',
          facility_id: 'some_facility_id',
          contact_id: 'some_contact_id'
        };
        auth.isOffline.returns(true);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: ['some_role'], facility_id: req.query.facility_id, contact_id: 'some_contact_id' },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = ['some_facility_id', 'a', 'b', 'c', '1', '2', '3'];
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([{
            roles: ['some_role'],
            facility_id: req.query.facility_id,
            contact_id: req.query.contact_id
          }]);
          chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
          chai.expect(authorization.getAllowedDocIds.args[0])
            .to.deep.equal([authContext, { includeTombstones: false }]);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 7, warn: false, limit: 10000 }]);
        });
      });

      it('should return warning when resulting doc ids length exceeds recommended limit', () => {
        req.query = {
          role: 'some_role',
          facility_id: 'some_facility_id'
        };
        auth.isOffline.returns(true);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: ['some_role'], facility_id: req.query.facility_id },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(10500), (x, idx) => idx + 1);
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 10500, warn: true, limit: 10000 }]);
        });
      });

      it('should only count unpurged docs', () => {
        req.query = {
          role: 'some_role',
          facility_id: 'some_facility_id'
        };
        auth.isOffline.returns(true);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: [req.query.role], facility_id: req.query.facility_id },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(10500), (x, idx) => idx + 1);
        const unpurgedIds = docIds.slice(0, 8000);
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(unpurgedIds);

        return controller.info(req, res).then(() => {
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: unpurgedIds.length, warn: false,limit: 10000 }]);
        });
      });

      it('should parse role json and use all provided roles', () => {
        req.query = {
          role: JSON.stringify(['role1', 'role2']),
          facility_id: 'some_facility_id'
        };
        auth.isOffline.returns(true);
        auth.hasAllPermissions.returns(true);
        const authContext = {
          userCtx: { roles: ['role1', 'role2'], facility_id: req.query.facility_id },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(1000), (x, idx) => idx + 1);
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([{
            roles: ['role1', 'role2'],
            facility_id: 'some_facility_id',
            contact_id: undefined,
          }]);
          chai.expect(purgedDocs.getUnPurgedIds.callCount).to.equal(1);
          chai.expect(purgedDocs.getUnPurgedIds.args[0]).to.deep.equal([['role1', 'role2'], docIds]);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 1000, warn: false, limit: 10000 }]);
        });
      });

      describe('roles scenarios', () => {
        const expected = { total_docs: 3, warn: false, limit: 10000 };
        const scenarios = [
          { role: 'aaaa', name: 'string single role' },
          { role: JSON.stringify('aaaa'), name: 'json single role' },
          { role: JSON.stringify(['1', '2', '3']), name: 'array of string roles works'},
          { role: JSON.stringify(['1', '2']).slice(0, -2), name:  'malformed json = param treated as string'},
          { role: JSON.stringify({ not: 'an array' }), fail: true, name: 'JSON object' },
          { role: JSON.stringify(['1', { not: 'a string' }]), fail: true, name: 'JSON array with objects' },
          { role: JSON.stringify(['1', 32, '2']), fail: true, name: 'JSON array with numbers' },
          { role: JSON.stringify(['1', undefined, '2']), fail: true, name: 'JSON array with undefined' },
          { role: JSON.stringify(['1', null, '2']), fail: true, name: 'JSON array with undefined' },
          { role: JSON.stringify(['1', true, '2']), fail: true, name: 'JSON array with boolean' },
        ];

        beforeEach(() => {
          authorization.getAuthorizationContext.callsFake(userCtx => Promise.resolve({ userCtx }));
          authorization.getAllowedDocIds.resolves(['1', '2', '3']);
          sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(['1', '2', '3']);
          auth.isOffline.returns(true);
          auth.hasAllPermissions.returns(true);
          serverUtils.error.resolves();
        });

        scenarios.map(scenario => {
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
        auth.isOnlineOnly.returns(false);
      });

      it('should query authorization with correct context', () => {
        const authContext = {
          userCtx,
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(8000), (x, idx) => idx + 1);

        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 8000, warn: false, limit: 10000 }]);

          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([userCtx]);
          chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
          chai.expect(authorization.getAllowedDocIds.args[0])
            .to.deep.equal([authContext, { includeTombstones: false } ]);
          chai.expect(purgedDocs.getUnPurgedIds.callCount).to.equal(1);
          chai.expect(purgedDocs.getUnPurgedIds.args[0]).to.deep.equal([['offline'], docIds]);
        });
      });

      it('should return correct warn value when over 10000 docs', () => {
        const authContext = {
          userCtx,
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(10500), (x, idx) => idx + 1);

        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 10500, warn: true, limit: 10000 }]);
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
        authorization.getAllowedDocIds.resolves(docIds);
        sinon.stub(purgedDocs, 'getUnPurgedIds').resolves(unpurgedIds);

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: unpurgedIds.length, warn: false, limit: 10000 }]);
        });
      });
    });
  });

  describe('create', () => {
    it('should respond with error when requester has no permission', () => {
      sinon.stub(auth, 'check').rejects({ status: 403 });
      return controller.create(req, res).then(() => {
        chai.expect(auth.check.callCount).to.equal(1);
        chai.expect(auth.check.args[0]).to.deep.equal([req, 'can_create_users']);
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
        chai.expect(auth.check.args[0]).to.deep.equal([req, 'can_update_users']);
        chai.expect(auth.getUserCtx.callCount).to.equal(2);
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
