const sinon = require('sinon');
const { expect } = require('chai');
const { Place, Qualifier, InvalidArgumentError} = require('@medic/cht-datasource');
const auth = require('../../../src/auth');
const controller = require('../../../src/controllers/place');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const {PermissionError} = require('../../../src/errors');

describe('Place Controller', () => {
  const userCtx = { hello: 'world' };
  let getUserCtx;
  let isOnlineOnly;
  let hasAllPermissions;
  let dataContextBind;
  let serverUtilsError;
  let req;
  let res;

  beforeEach(() => {
    getUserCtx = sinon
      .stub(auth, 'getUserCtx')
      .resolves(userCtx);
    isOnlineOnly = sinon.stub(auth, 'isOnlineOnly');
    hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
    dataContextBind = sinon.stub(dataContext, 'bind');
    serverUtilsError = sinon.stub(serverUtils, 'error');
    res = {
      json: sinon.stub(),
    };
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    const privilegeError = new PermissionError('Insufficient privileges');

    describe('get', () => {
      let placeGet;
      let placeGetWithLineage;

      beforeEach(() => {
        req = {
          params: { uuid: 'uuid' },
          query: { }
        };
        placeGet = sinon.stub();
        placeGetWithLineage = sinon.stub();
        dataContextBind
          .withArgs(Place.v1.get)
          .returns(placeGet);
        dataContextBind
          .withArgs(Place.v1.getWithLineage)
          .returns(placeGetWithLineage);
      });

      it('returns a place', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const place = { name: 'John Doe Castle' };
        placeGet.resolves(place);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Place.v1.get)).to.be.true;
        expect(placeGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(place)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a place with lineage when the query parameter is set to "true"', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const place = { name: 'John Doe Castle' };
        placeGetWithLineage.resolves(place);
        req.query.with_lineage = 'true';

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getWithLineage)).to.be.true;
        expect(placeGet.notCalled).to.be.true;
        expect(placeGetWithLineage.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(place)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a place without lineage when the query parameter is set something else', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const place = { name: 'John Doe Castle' };
        placeGet.resolves(place);
        req.query.with_lineage = '1';

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Place.v1.get)).to.be.true;
        expect(placeGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(place)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a 404 error if place is not found', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        placeGet.resolves(null);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Place.v1.get)).to.be.true;
        expect(placeGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Place not found' },
          req,
          res
        )).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if user does not have can_view_contacts permission', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(placeGet.notCalled).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if not an online user', async () => {
        isOnlineOnly.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.notCalled).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(placeGet.notCalled).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });
    });

    describe('getAll', () => {
      let placeGetPageByType;
      let qualifierByContactType;
      const placeType = 'place';
      const invalidPlaceType = 'invalidPlace';
      const placeTypeQualifier = { contactType: placeType };
      const place = { name: 'Clinic' };
      const limit = 100;
      const cursor = null;
      const places = Array.from({ length: 3 }, () => ({ ...place }));

      beforeEach(() => {
        req = {
          query: {
            type: placeType,
            cursor,
            limit,
          }
        };
        placeGetPageByType = sinon.stub();
        qualifierByContactType = sinon.stub(Qualifier, 'byContactType');
        dataContextBind.withArgs(Place.v1.getPage).returns(placeGetPageByType);
        qualifierByContactType.returns(placeTypeQualifier);
      });

      it('returns a page of places with correct query params', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        placeGetPageByType.resolves(places);

        await controller.v1.getAll(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getPage)).to.be.true;
        expect(placeGetPageByType.calledOnceWithExactly(placeTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(places)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if user does not have can_view_contacts permission', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(false);

        await controller.v1.getAll(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(qualifierByContactType.notCalled).to.be.true;
        expect(placeGetPageByType.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if not an online user', async () => {
        isOnlineOnly.returns(false);

        await controller.v1.getAll(req, res);

        expect(hasAllPermissions.notCalled).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(qualifierByContactType.notCalled).to.be.true;
        expect(placeGetPageByType.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns 400 error when placeType is invalid', async () => {
        const err = new InvalidArgumentError(`Invalid contact type: [${invalidPlaceType}].`);
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        placeGetPageByType.throws(err);

        await controller.v1.getAll(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getPage)).to.be.true;
        expect(placeGetPageByType.calledOnceWithExactly(placeTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('rethrows error in case of other errors', async () => {
        const err = new Error('error');
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        placeGetPageByType.throws(err);

        await controller.v1.getAll(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getPage)).to.be.true;
        expect(placeGetPageByType.calledOnceWithExactly(placeTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });
    });
  });
});
