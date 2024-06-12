const sinon = require('sinon');
const { expect } = require('chai');
const { Place, Qualifier } = require('@medic/cht-datasource');
const auth = require('../../../src/auth');
const controller = require('../../../src/controllers/place');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');

describe('Place Controller', () => {
  let authCheck;
  let dataContextBind;
  let serverUtilsError;
  let req;
  let res;

  beforeEach(() => {
    authCheck = sinon.stub(auth, 'check');
    dataContextBind = sinon.stub(dataContext, 'bind');
    serverUtilsError = sinon.stub(serverUtils, 'error');
    res = {
      json: sinon.stub(),
    };
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const qualifier = Object.freeze({ uuid: 'uuid' });
      let byUuid;
      let placeGet;
      let placeGetWithLineage;

      beforeEach(() => {
        req = {
          params: { uuid: 'uuid' },
          query: { }
        };
        byUuid = sinon
          .stub(Qualifier, 'byUuid')
          .returns(qualifier);
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
        const place = { name: 'John Doe Castle' };
        placeGet.resolves(place);

        await controller.v1.get(req, res);

        expect(authCheck.calledOnceWithExactly(req, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Place.v1.get)).to.be.true;
        expect(byUuid.calledOnceWithExactly(req.params.uuid)).to.be.true;
        expect(placeGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(place)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a place with lineage when the query parameter is set', async () => {
        const place = { name: 'John Doe Castle' };
        placeGetWithLineage.resolves(place);
        req.query.withLineage = 'true';

        await controller.v1.get(req, res);

        expect(authCheck.calledOnceWithExactly(req, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getWithLineage)).to.be.true;
        expect(byUuid.calledOnceWithExactly(req.params.uuid)).to.be.true;
        expect(placeGet.notCalled).to.be.true;
        expect(placeGetWithLineage.calledOnceWithExactly(qualifier)).to.be.true;
        expect(res.json.calledOnceWithExactly(place)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if place is not found', async () => {
        placeGet.resolves(null);

        await controller.v1.get(req, res);

        expect(authCheck.calledOnceWithExactly(req, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Place.v1.get)).to.be.true;
        expect(byUuid.calledOnceWithExactly(req.params.uuid)).to.be.true;
        expect(placeGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Place not found' },
          req,
          res
        )).to.be.true;
      });

      it('returns error if user unauthorized', async () => {
        const error = new Error('Unauthorized');
        authCheck.rejects(error);

        await controller.v1.get(req, res);

        expect(authCheck.calledOnceWithExactly(req, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(byUuid.notCalled).to.be.true;
        expect(placeGet.notCalled).to.be.true;
        expect(placeGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(error, req, res)).to.be.true;
      });
    });
  });
});
