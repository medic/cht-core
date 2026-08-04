const sinon = require('sinon');
const { expect } = require('chai');
const { Person, Qualifier } = require('@medic/cht-datasource');
const auth = require('../../../src/auth');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const mutedParent = require('../../../src/services/muted-parent');

describe('Person Controller', () => {
  const sandbox = sinon.createSandbox();
  const personGet = sandbox.stub();
  const personGetWithLineage = sandbox.stub();
  const personGetPageByType = sandbox.stub();
  const createPerson = sandbox.stub();
  const updatePerson = sandbox.stub();

  let serverUtilsError;
  let assertPermissions;
  let req;
  let res;
  let controller;

  before(() => {
    const bind = sinon.stub(dataContext, 'bind');
    bind.withArgs(Person.v1.get).returns(personGet);
    bind.withArgs(Person.v1.getWithLineage).returns(personGetWithLineage);
    bind.withArgs(Person.v1.getPage).returns(personGetPageByType);
    bind.withArgs(Person.v1.create).returns(createPerson);
    bind.withArgs(Person.v1.update).returns(updatePerson);
    controller = require('../../../src/controllers/person');
  });

  beforeEach(() => {
    assertPermissions = sinon.stub(auth, 'assertPermissions').resolves();
    sinon.stub(mutedParent, 'assertCanCreateOnMutedParent').resolves();
    serverUtilsError = sinon.stub(serverUtils, 'error');
    res = {
      json: sinon.stub(),
    };
    controller = require('../../../src/controllers/person');
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

      it('returns a person', async () => {
        const person = { name: 'John Doe' };
        personGet.resolves(person);

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(personGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a person with lineage when the query parameter is set to "true"', async () => {
        const person = { name: 'John Doe' };
        personGetWithLineage.resolves(person);
        req.query.with_lineage = 'true';

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(personGet.notCalled).to.be.true;
        expect(personGetWithLineage.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a person without lineage when the query parameter is set something else', async () => {
        const person = { name: 'John Doe' };
        personGet.resolves(person);
        req.query.with_lineage = '1';

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(personGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(person)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if person is not found', async () => {
        personGet.resolves(null);

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(personGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(personGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Person not found' },
          req,
          res
        )).to.be.true;
      });
    });

    describe('getAll', () => {
      const personType = 'person';
      const personTypeQualifier = Qualifier.byContactType(personType);
      const person = { name: 'John Doe' };
      const limit = 100;
      const cursor = null;
      const people = Array.from({ length: 3 }, () => ({ ...person }));

      it('returns a page of people with correct query params', async () => {
        personGetPageByType.resolves(people);
        req = {
          query: {
            type: personType,
            cursor,
            limit,
          }
        };

        await controller.v1.getAll(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(personGetPageByType.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(people)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });
    });

    describe('create', () => {
      it('creates a person doc for valid input', async() => {
        const input = {
          name: 'test-user',
          type: 'person',
          parent: 'p1',
          reported_date: 12312312
        };
        req = { body: input };
        const createdPersonDoc = {...input, _id: '123', rev: '1-rev'};
        const userCtx = { roles: ['chw'] };
        assertPermissions.resolves(userCtx);
        createPerson.resolves(createdPersonDoc);

        await controller.v1.create(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAny: ['can_create_people', 'can_edit'] }
        )).to.be.true;
        expect(mutedParent.assertCanCreateOnMutedParent.calledOnceWithExactly(userCtx, 'p1')).to.be.true;
        expect(createPerson.calledOnceWithExactly(input)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(createdPersonDoc)).to.be.true;
      });

      it('rejects when parent is muted and user lacks can_create_contacts_under_muted_places', async () => {
        const input = { name: 'p', type: 'person', parent: 'muted-clinic' };
        req = { body: input };
        const userCtx = { roles: ['chw'] };
        assertPermissions.resolves(userCtx);
        const permError = new Error('Insufficient privileges to create contacts on muted places');
        permError.code = 403;
        mutedParent.assertCanCreateOnMutedParent.rejects(permError);

        await controller.v1.create(req, res);

        expect(mutedParent.assertCanCreateOnMutedParent.calledOnceWithExactly(userCtx, 'muted-clinic')).to.be.true;
        expect(createPerson.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(permError, req, res)).to.be.true;
      });
    });

    describe('update', () => {
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
          params: { uuid: '123' },
          body: input
        };
        const updatePersonDoc = { ...input, rev: '2-rev' };
        updatePerson.resolves(updatePersonDoc);
         
        await controller.v1.update(req, res);
        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAny: ['can_update_people', 'can_edit'] }
        )).to.be.true;
        expect(updatePerson.calledOnceWithExactly(input)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(updatePersonDoc)).to.be.true;
      });
    });
  });
});
