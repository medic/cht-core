const sinon = require('sinon');
const { expect } = require('chai');
const { Person, Qualifier, InvalidArgumentError } = require('@medic/cht-datasource');
const auth = require('../../../src/auth');
const controller = require('../../../src/controllers/person');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const {PermissionError} = require('../../../src/errors');

describe('Person Controller', () => {
  let dataContextBind;
  let serverUtilsError;
  let checkUserPermissions;
  let req;
  let res;

  beforeEach(() => {
    checkUserPermissions = sinon.stub(auth, 'checkUserPermissions');
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

      it('returns a person', async () => {
        checkUserPermissions.resolves();
        const person = { name: 'John Doe' };
        personGet.resolves(person);

        await controller.v1.get(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_contacts'])).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.get)).to.be.true;
        expect(personGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a person with lineage when the query parameter is set to "true"', async () => {
        checkUserPermissions.resolves();
        const person = { name: 'John Doe' };
        personGetWithLineage.resolves(person);
        req.query.with_lineage = 'true';

        await controller.v1.get(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_contacts'])).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getWithLineage)).to.be.true;
        expect(personGet.notCalled).to.be.true;
        expect(personGetWithLineage.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a person without lineage when the query parameter is set something else', async () => {
        checkUserPermissions.resolves();
        const person = { name: 'John Doe' };
        personGet.resolves(person);
        req.query.with_lineage = '1';

        await controller.v1.get(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_contacts'])).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.get)).to.be.true;
        expect(personGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if person is not found', async () => {
        checkUserPermissions.resolves();
        personGet.resolves(null);

        await controller.v1.get(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_contacts'])).to.be.true;
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
        const privilegeError = new PermissionError('Insufficient Privileges');
        checkUserPermissions.rejects(privilegeError);

        await controller.v1.get(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_contacts'])).to.be.true;
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
      });

      it('returns error if not an online user', async () => {
        const privilegeError = new PermissionError('Insufficient Privileges');
        checkUserPermissions.rejects(privilegeError);

        await controller.v1.get(req, res);

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
        checkUserPermissions.resolves();
        personGetPageByType.resolves(people);

        await controller.v1.getAll(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_contacts'])).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getPage)).to.be.true;
        expect(personGetPageByType.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(people)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns error if user does not have can_view_contacts permission', async () => {
        const privilegeError = new PermissionError('Insufficient privileges');
        checkUserPermissions.rejects(privilegeError);
        await controller.v1.getAll(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_contacts'])).to.be.true;
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
      });

      it('returns error if not an online user', async () => {
        const privilegeError = new PermissionError('Insufficient privileges');
        checkUserPermissions.rejects(privilegeError);

        await controller.v1.getAll(req, res);

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
      });

      it('returns 400 error when personType is invalid', async () => {
        const err = new InvalidArgumentError(`Invalid contact type: [${invalidPersonType}]`);
        checkUserPermissions.resolves();
        personGetPageByType.throws(err);

        await controller.v1.getAll(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_contacts'])).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getPage)).to.be.true;
        expect(personGetPageByType.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
      });

      it('rethrows error in case of other errors', async () => {
        const err = new Error('error');
        checkUserPermissions.resolves();
        personGetPageByType.throws(err);

        await controller.v1.getAll(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_contacts'])).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getPage)).to.be.true;
        expect(personGetPageByType.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
      });
    });

    describe('create', () => {
      let createPerson;
      beforeEach(() => {
        createPerson = sinon.stub();
        dataContextBind
          .withArgs(Person.v1.create)
          .returns(createPerson);
      });

      it('throws error for missing required fields', async() => {
        const input = {
          name: 'test-user',
          parent: 'p1',
          reported_date: 12312312
        };
        req = {
          body: {
            ...input
          }
        };
        checkUserPermissions.resolves();
         
        const err = new InvalidArgumentError(`Missing or empty required fields (name, type) for [${JSON
          .stringify(input)}].`);
        await controller.v1.create(req, res);
        expect(checkUserPermissions
          .calledWith(req, ['can_view_contacts', 'can_create_people'], ['can_edit'])).to.be.true;
        expect(createPerson.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(InvalidArgumentError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(err.message);
        expect(dataContextBind.notCalled).to.be.true;
      });

      it('creates a person doc for valid input', async() => {
        const input = {
          name: 'test-user',
          type: 'person',
          parent: 'p1',
          reported_date: 12312312
        };
        req = {
          body: {
            ...input
          }
        };
        checkUserPermissions.resolves();
        const createdPersonDoc = {...input, _id: '123', rev: '1-rev'}; 
        createPerson.resolves(createdPersonDoc);
         
        await controller.v1.create(req, res);
        expect(checkUserPermissions
          .calledWith(req, ['can_view_contacts', 'can_create_people'], ['can_edit'])).to.be.true;
        expect(createPerson.calledOnce).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(dataContextBind.calledOnce).to.be.true;
        expect(createPerson.calledOnce).to.be.true;
        expect(res.json.calledOnceWithExactly(createdPersonDoc)).to.be.true;
      });
    });

    describe('update', () => {
      let updatePerson;
      beforeEach(() => {
        updatePerson = sinon.stub();
        dataContextBind
          .withArgs(Person.v1.update)
          .returns(updatePerson);
      });

      it('updated a person doc for valid update input', async() => {
        const input = {
          name: 'test-user',
          _id: '123',
          rev: '1-rev',
          type: 'contact',
          contact_type: 'person',
          parent: 'p1',
          reported_date: 12312312
        };
        req = {
          body: {
            ...input
          }
        };
        checkUserPermissions.resolves();
        const updatePersonDoc = {...input, _id: '123', rev: '1-rev'}; 
        updatePerson.resolves(updatePersonDoc);
         
        await controller.v1.update(req, res);
        expect(checkUserPermissions
          .calledWith(req, ['can_view_contacts', 'can_update_people'], ['can_edit'])).to.be.true;
        expect(updatePerson.calledOnce).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(dataContextBind.calledOnce).to.be.true;
        expect(updatePerson.calledOnce).to.be.true;
        expect(res.json.calledOnceWithExactly(updatePersonDoc)).to.be.true;
      });
    });
  });
});
