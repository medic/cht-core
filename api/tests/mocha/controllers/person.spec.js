const sinon = require('sinon');
const { expect } = require('chai');
const { Person, Qualifier, InvalidArgumentError } = require('@medic/cht-datasource');
const auth = require('../../../src/auth');
const controller = require('../../../src/controllers/person');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const {PermissionError} = require('../../../src/errors');

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
    const privilegeError = new PermissionError('Insufficient privileges');

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
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
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
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
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
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
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
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if user does not have can_view_contacts permission', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(personGet.notCalled).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
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
        expect(personGet.notCalled).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
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
      let personGetPageByType;
      let qualifierByContactType;
      const personType = 'person';
      const invalidPersonType = 'invalidPerson';
      const personTypeQualifier = { contactType: personType };
      const person = { name: 'John Doe' };
      const limit = 100;
      const cursor = null;
      const people = Array.from({ length: 3 }, () => ({ ...person }));

      beforeEach(() => {
        req = {
          query: {
            type: personType,
            cursor,
            limit,
          }
        };
        personGetPageByType = sinon.stub();
        qualifierByContactType = sinon.stub(Qualifier, 'byContactType');
        dataContextBind.withArgs(Person.v1.getPage).returns(personGetPageByType);
        qualifierByContactType.returns(personTypeQualifier);
      });

      it('returns a page of people with correct query params', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        personGetPageByType.resolves(people);

        await controller.v1.getAll(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getPage)).to.be.true;
        expect(personGetPageByType.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(people)).to.be.true;
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
        expect(personGetPageByType.notCalled).to.be.true;
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
        expect(personGetPageByType.notCalled).to.be.true;
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

      it('returns 400 error when personType is invalid', async () => {
        const err = new InvalidArgumentError(`Invalid contact type: [${invalidPersonType}]`);
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        personGetPageByType.throws(err);

        await controller.v1.getAll(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getPage)).to.be.true;
        expect(personGetPageByType.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('rethrows error in case of other errors', async () => {
        const err = new Error('error');
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        personGetPageByType.throws(err);

        await controller.v1.getAll(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getPage)).to.be.true;
        expect(personGetPageByType.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });
    });
  });
});
