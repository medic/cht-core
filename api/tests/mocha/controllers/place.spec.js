const sinon = require('sinon');
const { expect } = require('chai');
const { Place, Qualifier} = require('@medic/cht-datasource');
const auth = require('../../../src/auth');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const mutedParent = require('../../../src/services/muted-parent');

describe('Place Controller', () => {
  const sandbox = sinon.createSandbox();
  const placeGet = sandbox.stub();
  const placeGetWithLineage = sandbox.stub();
  const placeGetPageByType = sandbox.stub();
  const placeCreate = sandbox.stub();
  const updatePlace = sandbox.stub();

  let assertPermissions;
  let serverUtilsError;
  let req;
  let res;
  let controller;

  before(() => {
    const bind = sinon.stub(dataContext, 'bind');
    bind.withArgs(Place.v1.get).returns(placeGet);
    bind.withArgs(Place.v1.getWithLineage).returns(placeGetWithLineage);
    bind.withArgs(Place.v1.getPage).returns(placeGetPageByType);
    bind.withArgs(Place.v1.create).returns(placeCreate);
    bind.withArgs(Place.v1.update).returns(updatePlace);
    controller = require('../../../src/controllers/place');
  });

  beforeEach(() => {
    assertPermissions = sinon.stub(auth, 'assertPermissions').resolves();
    sinon.stub(mutedParent, 'assertCanCreateOnMutedParent').resolves();
    serverUtilsError = sinon.stub(serverUtils, 'error');
    res = {
      json: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
    sandbox.reset();
  });

  describe('v1', () => {
    describe('get', () => {
      beforeEach(() => {
        req = {
          params: { uuid: 'uuid' },
          query: { }
        };
      });

      it('returns a place', async () => {
        const place = { name: 'John Doe Castle' };
        placeGet.resolves(place);

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(placeGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(place)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a place with lineage when the query parameter is set to "true"', async () => {
        const place = { name: 'John Doe Castle' };
        placeGetWithLineage.resolves(place);
        req.query.with_lineage = 'true';

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(placeGet.notCalled).to.be.true;
        expect(placeGetWithLineage.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(place)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a place without lineage when the query parameter is set something else', async () => {
        const place = { name: 'John Doe Castle' };
        placeGet.resolves(place);
        req.query.with_lineage = '1';

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(placeGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(place)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if place is not found', async () => {
        placeGet.resolves(null);

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(placeGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Place not found' },
          req,
          res
        )).to.be.true;
      });
    });

    describe('getAll', () => {
      const placeType = 'place';
      const placeTypeQualifier = Qualifier.byContactType(placeType);
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
      });

      it('returns a page of places with correct query params', async () => {
        placeGetPageByType.resolves(places);

        await controller.v1.getAll(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(placeGetPageByType.calledOnceWithExactly(placeTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(places)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });
    });

    describe('create', () => {
      it('returns place doc for valid input', async() => {
        const input = {
          name: 'place-1',
          parent: 'p1',
          type: 'place',
          reported_date: 12312312
        };
        req = { body: input };
        const expected_doc = {
          ...input,
          _id: '1',
          _rev: '1-rev'
        };
        const userCtx = { roles: ['chw'] };
        assertPermissions.resolves(userCtx);
        placeCreate.resolves(expected_doc);

        await controller.v1.create(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAny: ['can_create_places', 'can_edit'] }
        )).to.be.true;
        expect(mutedParent.assertCanCreateOnMutedParent.calledOnceWithExactly(userCtx, 'p1')).to.be.true;
        expect(placeCreate.calledOnceWithExactly(input)).to.be.true;
        expect(res.json.calledOnceWithExactly(expected_doc)).to.be.true;
      });

      it('rejects when parent is muted and user lacks can_create_contacts_under_muted_places', async () => {
        const input = { name: 'p', type: 'place', parent: 'muted-hc' };
        req = { body: input };
        const userCtx = { roles: ['chw'] };
        assertPermissions.resolves(userCtx);
        const permError = new Error('Insufficient privileges to create contacts on muted places');
        permError.code = 403;
        mutedParent.assertCanCreateOnMutedParent.rejects(permError);

        await controller.v1.create(req, res);

        expect(mutedParent.assertCanCreateOnMutedParent.calledOnceWithExactly(userCtx, 'muted-hc')).to.be.true;
        expect(placeCreate.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(permError, req, res)).to.be.true;
      });
    });

    describe('update', () => {
      it('updates a place doc for valid update input', async() => {
        const input = {
          name: 'test-user',
          _id: '123',
          rev: '1-rev',
          type: 'contact',
          contact_type: 'place',
          parent: {
            _id: '1'
          },
          reported_date: 12312312
        };
        req = {
          params: { uuid: '123' },
          body: input
        };
        const updatePlaceDoc = {...input, _id: '123', rev: '2-rev'}; 
        updatePlace.resolves(updatePlaceDoc);

        await controller.v1.update(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAny: ['can_update_places', 'can_edit'] }
        )).to.be.true;
        expect(updatePlace.calledOnceWithExactly(input)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(updatePlaceDoc)).to.be.true;
      });
    });
  });
});
