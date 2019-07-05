const sinon = require('sinon');
const chai = require('chai');
const controller = require('../../../src/controllers/users');
const auth = require('../../../src/auth');
const authorization = require('../../../src/services/authorization');
const serverUtils = require('../../../src/server-utils');

let req;
let userCtx;
let res;

describe('Users Controller', () => {
  beforeEach(() => {
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
      auth.isOnlineOnly.returns(true);
    });

    describe('online users', () => {
      it('should respond with error when user does not have required permissions', () => {
        serverUtils.error.resolves();
        auth.hasAllPermissions.returns(false);
        return controller.info(req, res).then(() => {
          chai.expect(auth.hasAllPermissions.callCount).to.equal(1);
          chai.expect(auth.hasAllPermissions.args[0]).to.deep.equal([userCtx, 'can_update_users']);
          chai.expect(serverUtils.error.args[0]).to.deep.equal([{ code: 403, reason: 'Insufficient privileges' }, req, res]);
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
          chai.expect(serverUtils.error.args[0]).to.deep.equal([{ code: 400, reason: 'Missing required query params: role and/or facility_id' }, req, res]);
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
          chai.expect(serverUtils.error.args[0]).to.deep.equal([{ code: 400, reason: 'Missing required query params: role and/or facility_id' }, req, res]);
        });
      });

      it('should respond with error when facility_id is provided without role', () => {
        serverUtils.error.resolves();
        req.query.facility_id = 'some_facility_id';
        auth.hasAllPermissions.returns(true);
        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0]).to.deep.equal([{ code: 400, reason: 'Missing required query params: role and/or facility_id' }, req, res]);
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
          chai.expect(serverUtils.error.args[0]).to.deep.equal([{ code: 400, reason: 'Provided role is not offline' }, req, res]);
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
          userCtx: { roles: [req.query.role], facility_id: req.query.facility_id },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = ['some_facility_id', 'a', 'b', 'c', '1', '2', '3'];
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([{
            roles: [req.query.role],
            facility_id: req.query.facility_id,
            contact_id: undefined
          }]);
          chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
          chai.expect(authorization.getAllowedDocIds.args[0]).to.deep.equal([authContext, { includeTombstones: false, limit: 20000 }]);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 7, warn: false }]);
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
          userCtx: { roles: [req.query.role], facility_id: req.query.facility_id, contact_id: 'some_contact_id' },
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = ['some_facility_id', 'a', 'b', 'c', '1', '2', '3'];
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([{
            roles: [req.query.role],
            facility_id: req.query.facility_id,
            contact_id: req.query.contact_id
          }]);
          chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
          chai.expect(authorization.getAllowedDocIds.args[0]).to.deep.equal([authContext, { includeTombstones: false, limit: 20000 }]);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 7, warn: false}]);
        });
      });

      it('should return warning when doc Ids exceeds limit', () => {
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
        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 10500, warn: true }]);
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

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 8000, warn: false }]);

          chai.expect(authorization.getAuthorizationContext.callCount).to.equal(1);
          chai.expect(authorization.getAuthorizationContext.args[0]).to.deep.equal([userCtx]);
          chai.expect(authorization.getAllowedDocIds.callCount).to.equal(1);
          chai.expect(authorization.getAllowedDocIds.args[0]).to.deep.equal([authContext, { includeTombstones: false, limit: 20000 } ]);
        });
      });

      it('should return correct warn value when under 10000 docs', () => {
        const authContext = {
          userCtx,
          contactsByDepthKeys: [['some_facility_id']],
          subjectIds: ['some_facility_id', 'a', 'b', 'c']
        };
        const docIds = Array.from(Array(10500), (x, idx) => idx + 1);

        authorization.getAuthorizationContext.resolves(authContext);
        authorization.getAllowedDocIds.resolves(docIds);

        return controller.info(req, res).then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(0);
          chai.expect(res.json.callCount).to.equal(1);
          chai.expect(res.json.args[0]).to.deep.equal([{ total_docs: 10500, warn: true }]);
        });
      });
    });
  });
});
