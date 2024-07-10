const sinon = require('sinon');
const { expect } = require('chai');
const { Person, Qualifier } = require('@medic/cht-datasource');
const auth = require('../../../src/auth');
const controller = require('../../../src/controllers/person');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');

describe('Person Controller', () => {
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
    describe('get', () => {
      let personGet;
      let personGetWithLineage;

      beforeEach(() => {
        req = {
          params: { uuid: 'uuid' },
          query: { }
        };
        personGet = sinon.stub();
        personGetWithLineage = sinon.stub();
        dataContextBind
          .withArgs(Person.v1.get)
          .returns(personGet);
        dataContextBind
          .withArgs(Person.v1.getWithLineage)
          .returns(personGetWithLineage);
      });

      afterEach(() => {
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a person', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const person = { name: 'John Doe' };
        personGet.resolves(person);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.get)).to.be.true;
        expect(personGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a person with lineage when the query parameter is set to "true"', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const person = { name: 'John Doe' };
        personGetWithLineage.resolves(person);
        req.query.with_lineage = 'true';

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getWithLineage)).to.be.true;
        expect(personGet.notCalled).to.be.true;
        expect(personGetWithLineage.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a person without lineage when the query parameter is set something else', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const person = { name: 'John Doe' };
        personGet.resolves(person);
        req.query.with_lineage = '1';

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.get)).to.be.true;
        expect(personGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if person is not found', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        personGet.resolves(null);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.get)).to.be.true;
        expect(personGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Person not found' },
          req,
          res
        )).to.be.true;
      });

      it('returns error if user does not have can_view_contacts permission', async () => {
        const error = { code: 403, message: 'Insufficient privileges' };
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(personGet.notCalled).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(error, req, res)).to.be.true;
      });

      it('returns error if not an online user', async () => {
        const error = { code: 403, message: 'Insufficient privileges' };
        isOnlineOnly.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.notCalled).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(personGet.notCalled).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(error, req, res)).to.be.true;
      });
    });
  });
});
