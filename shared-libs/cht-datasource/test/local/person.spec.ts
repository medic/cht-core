import sinon, { SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as Person from '../../src/local/person';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Lineage from '../../src/local/libs/lineage';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';
import { NotFoundError } from '../../src/libs/error';

describe('local person', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let debug: SinonStub;
  let isPerson: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    debug = sinon.stub(logger, 'debug');
    isPerson = sinon.stub(contactTypeUtils, 'isPerson');
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    const settings = { hello: 'world' } as const;

    describe('get', () => {
      const identifier = { uuid: 'uuid' } as const;
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
      });

      it('returns a person by UUID', async () => {
        const doc = { type: 'person' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPerson.returns(true);

        const result = await Person.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(warn.notCalled).to.be.true;
      });

      it('returns null if the identified doc does not have a person type', async () => {
        const doc = { type: 'not-person', _id: '_id' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPerson.returns(false);

        const result = await Person.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${doc._id}] is not a valid person.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Person.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(isPerson.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No person found for identifier [${identifier.uuid}].`)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const identifier = { uuid: 'uuid' } as const;
      let mockFetchHydratedDoc: SinonStub;

      beforeEach(() => {
        mockFetchHydratedDoc = sinon.stub(Lineage, 'fetchHydratedDoc');
      });

      it('returns a person with lineage', async () => {
        const personWithLineage = { type: 'person', _id: 'uuid', _rev: 'rev' };
        const mockFunction = sinon.stub().resolves(personWithLineage);
        mockFetchHydratedDoc.returns(mockFunction);
        isPerson.returns(true);
        settingsGetAll.returns(settings);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(personWithLineage);
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, personWithLineage)).to.be.true;
        expect(warn.notCalled).to.be.true;
        expect(debug.notCalled).to.be.true;
      });

      it('returns null when no person or lineage is found', async () => {
        const mockFunction = sinon.stub().resolves(null);
        mockFetchHydratedDoc.returns(mockFunction);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No person found for identifier [${identifier.uuid}].`)).to.be.true;
        expect(debug.notCalled).to.be.true;
      });

      it('returns null if the doc returned is not a person', async () => {
        const notPerson = { type: 'not-person', _id: 'uuid', _rev: 'rev' };
        const mockFunction = sinon.stub().resolves(notPerson);
        mockFetchHydratedDoc.returns(mockFunction);
        isPerson.returns(false);
        settingsGetAll.returns(settings);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, notPerson)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid person.`)).to.be.true;
        expect(debug.notCalled).to.be.true;
      });
    });

    describe('getPage', () => {
      const limit = 3;
      const cursor = null;
      const notNullCursor = '5';
      const personIdentifier = 'person';
      const personTypeQualifier = {contactType: personIdentifier} as const;
      const invalidPersonTypeQualifier = { contactType: 'invalid' } as const;
      const personType = [{person: true, id: personIdentifier}] as Record<string, unknown>[];
      let getPersonTypes: SinonStub;
      let queryDocsByKeyInner: SinonStub;
      let queryDocsByKeyOuter: SinonStub;
      let fetchAndFilterInner: SinonStub;
      let fetchAndFilterOuter: SinonStub;

      beforeEach(() => {
        queryDocsByKeyInner = sinon.stub();
        queryDocsByKeyOuter = sinon.stub(LocalDoc, 'queryDocsByKey').returns(queryDocsByKeyInner);       
        getPersonTypes = sinon.stub(contactTypeUtils, 'getPersonTypes').returns(personType);
        settingsGetAll.returns(settings);
        fetchAndFilterInner = sinon.stub();
        fetchAndFilterOuter = sinon.stub(LocalDoc, 'fetchAndFilter').returns(fetchAndFilterInner);
      });

      it('returns a page of people', async () => {
        const doc = { type: 'person'};
        const docs = [doc, doc, doc];
        const expectedResult = {
          cursor: '3',
          data: docs
        };
        fetchAndFilterInner.resolves(expectedResult);

        const res = await Person.v1.getPage(localContext)(personTypeQualifier, cursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(
          queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type')
        ).to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        expect(isPerson.notCalled).to.be.true;
      });

      it('returns a page of people when cursor is not null', async () => {
        const doc = { type: 'person'};
        const docs = [doc, doc, doc];
        const expectedResult = {
          cursor: '8',
          data: docs
        };
        fetchAndFilterInner.resolves(expectedResult);

        const res = await Person.v1.getPage(localContext)(personTypeQualifier, notNullCursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.callCount).to.equal(1);
        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(
          queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type')
        ).to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
        expect(isPerson.notCalled).to.be.true;
      });

      it('throws an error if person identifier is invalid/does not exist', async () => {
        await expect(Person.v1.getPage(localContext)(invalidPersonTypeQualifier, cursor, limit)).to.be.rejectedWith(
          `Invalid contact type [${invalidPersonTypeQualifier.contactType}].`
        );

        expect(settingsGetAll.calledOnce).to.be.true;
        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type'))
          .to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.notCalled).to.be.true;
      });

      [
        {},
        '-1',
        undefined,
      ].forEach((invalidSkip ) => {
        it(`throws an error if cursor is invalid: ${JSON.stringify(invalidSkip)}`, async () => {
          await expect(Person.v1.getPage(localContext)(personTypeQualifier, invalidSkip as string, limit))
            .to.be.rejectedWith(`The cursor must be a string or null for first page: [${JSON.stringify(invalidSkip)}]`);

          expect(settingsGetAll.calledOnce).to.be.true;
          expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
          expect(queryDocsByKeyOuter.calledOnceWithExactly(
            localContext.medicDb, 'medic-client/contacts_by_type'
          )).to.be.true;
          expect(queryDocsByKeyInner.notCalled).to.be.true;
          expect(fetchAndFilterInner.notCalled).to.be.true;
          expect(fetchAndFilterOuter.notCalled).to.be.true;
          expect(isPerson.notCalled).to.be.true;
        });
      });

      it('returns empty array if people does not exist', async () => {
        const expectedResult = {
          data: [],
          cursor
        };
        fetchAndFilterInner.resolves(expectedResult);

        const res = await Person.v1.getPage(localContext)(personTypeQualifier, cursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(settingsGetAll.calledOnce).to.be.true;
        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(
          queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type')
        ).to.be.true;
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        expect(isPerson.notCalled).to.be.true;
      });
    });

    describe('create', () => {
      let createDocInner: SinonStub;
      let createDocOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      let getDocByIdOuter: SinonStub;
      let getPersonTypes: SinonStub;
      let getTypeId: SinonStub;
      let fetchHydratedDocInner: SinonStub;
      let fetchHydratedDocOuter: SinonStub;

      beforeEach(() => {
        createDocInner = sinon.stub();
        createDocOuter = sinon.stub(LocalDoc, 'createDoc').returns(createDocInner);
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
        getPersonTypes = sinon.stub(contactTypeUtils, 'getPersonTypes');
        getTypeId = sinon.stub(contactTypeUtils, 'getTypeId');
        fetchHydratedDocInner = sinon.stub();
        fetchHydratedDocOuter = sinon.stub(Lineage, 'fetchHydratedDoc').returns(fetchHydratedDocInner);
        settingsGetAll.returns(settings);
      });

      it('creates a person with minimal data', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const qualifier = { type: 'patient', name: 'John Doe' };
        const createdDoc = { _id: 'generated-uuid', _rev: '1-abc', ...qualifier, reported_date: 12345 };

        getPersonTypes.returns([personType]);
        createDocInner.resolves(createdDoc);
        isPerson.returns(true);

        const result = await Person.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.include({ type: 'patient', name: 'John Doe' });
        expect(createDocInner.firstCall.args[0]).to.have.property('reported_date');
        expect(isPerson.calledOnceWithExactly(settings, createdDoc)).to.be.true;
      });

      it('creates a person with provided reported_date', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const qualifier = { type: 'patient', name: 'Jane Doe', reported_date: 99999 };
        const createdDoc = { _id: 'generated-uuid', _rev: '1-abc', ...qualifier };

        getPersonTypes.returns([personType]);
        createDocInner.resolves(createdDoc);
        isPerson.returns(true);

        const result = await Person.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.include({ reported_date: 99999 });
      });

      it('converts ISO string reported_date to epoch milliseconds', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const isoDate = '2025-01-15T10:30:00.000Z';
        const expectedEpoch = new Date(isoDate).getTime();
        const qualifier = { type: 'patient', name: 'Jane Doe', reported_date: isoDate };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'patient',
          name: 'Jane Doe',
          reported_date: expectedEpoch
        };

        getPersonTypes.returns([personType]);
        createDocInner.resolves(createdDoc);
        isPerson.returns(true);

        const result = await Person.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.have.property('reported_date', expectedEpoch);
        expect(createDocInner.firstCall.args[0].reported_date).to.be.a('number');
      });

      it('converts ISO string with milliseconds to epoch milliseconds', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const isoDate = '2025-01-15T10:30:00.123Z';
        const expectedEpoch = new Date(isoDate).getTime();
        const qualifier = { type: 'patient', name: 'Jane Doe', reported_date: isoDate };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'patient',
          name: 'Jane Doe',
          reported_date: expectedEpoch
        };

        getPersonTypes.returns([personType]);
        createDocInner.resolves(createdDoc);
        isPerson.returns(true);

        const result = await Person.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.have.property('reported_date', expectedEpoch);
      });

      it('throws an error for invalid reported_date string', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const qualifier = { type: 'patient', name: 'Jane Doe', reported_date: 'invalid-date' };

        getPersonTypes.returns([personType]);

        await expect(Person.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('Invalid reported_date [invalid-date]. Must be a valid date string or timestamp.');

        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if person type is invalid', async () => {
        const qualifier = { type: 'invalid-type', name: 'John Doe' };

        getPersonTypes.returns([{ id: 'patient', person: true, parents: [] }]);

        await expect(Person.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('Invalid person type [invalid-type].');

        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if _rev is provided for create', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const qualifier = { type: 'patient', name: 'John Doe', _rev: '1-abc' };

        getPersonTypes.returns([personType]);

        await expect(Person.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('_rev is not allowed for create operations.');

        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if parent is required but not provided', async () => {
        const personType = { id: 'child', person: true, parents: ['parent_type'] };
        const qualifier = { type: 'child', name: 'Child' };

        getPersonTypes.returns([personType]);

        await expect(Person.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('parent is required for person type [child].');

        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if parent is provided for top-level person type', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const qualifier = { type: 'patient', name: 'Patient', parent: 'parent-uuid' };

        getPersonTypes.returns([personType]);

        await expect(Person.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('parent is not allowed for person type [patient]. This is a top-level person type.');

        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if parent document is not found', async () => {
        const personType = { id: 'child', person: true, parents: ['parent_type'] };
        const qualifier = { type: 'child', name: 'Child', parent: 'parent-uuid' };

        getPersonTypes.returns([personType]);
        getDocByIdInner.resolves(null);

        await expect(Person.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('Parent document [parent-uuid] not found.');

        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly('parent-uuid')).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws an error if parent type is invalid', async () => {
        const personType = { id: 'child', person: true, parents: ['allowed_parent'] };
        const qualifier = { type: 'child', name: 'Child', parent: 'parent-uuid' };
        const parentDoc = { _id: 'parent-uuid', type: 'wrong_parent' };

        getPersonTypes.returns([personType]);
        getDocByIdInner.resolves(parentDoc);
        getTypeId.returns('wrong_parent');

        await expect(Person.v1.create(localContext)(qualifier))
          .to.be.rejectedWith(
            'Invalid parent type [wrong_parent] for person type [child]. Allowed parent types: [allowed_parent].'
          );

        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly('parent-uuid')).to.be.true;
        expect(getTypeId.calledOnceWithExactly(parentDoc)).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('creates a person with parent as string UUID', async () => {
        const personType = { id: 'child', person: true, parents: ['parent_type'] };
        const qualifier = { type: 'child', name: 'Child', parent: 'parent-uuid' };
        const parentDoc = { _id: 'parent-uuid', type: 'parent_type' };
        const hydratedParent = { _id: 'parent-uuid' };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'child',
          name: 'Child',
          parent: hydratedParent,
          reported_date: 12345
        };

        getPersonTypes.returns([personType]);
        getDocByIdInner.resolves(parentDoc);
        getTypeId.returns('parent_type');
        fetchHydratedDocInner.resolves(hydratedParent);
        createDocInner.resolves(createdDoc);
        isPerson.returns(true);

        const result = await Person.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(getDocByIdInner.calledOnceWithExactly('parent-uuid')).to.be.true;
        expect(fetchHydratedDocOuter.calledWith(localContext.medicDb)).to.be.true;
        expect(fetchHydratedDocInner.calledWith('parent-uuid')).to.be.true;
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.have.property('parent');
      });

      it('creates a person with parent as hydrated object', async () => {
        const personType = { id: 'child', person: true, parents: ['parent_type'] };
        const hydratedParent = { _id: 'parent-uuid', parent: { _id: 'grandparent-uuid' } };
        const qualifier = { type: 'child', name: 'Child', parent: hydratedParent };
        const parentDoc = { _id: 'parent-uuid', type: 'parent_type' };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'child',
          name: 'Child',
          parent: hydratedParent,
          reported_date: 12345
        };

        getPersonTypes.returns([personType]);
        getDocByIdInner.resolves(parentDoc);
        getTypeId.returns('parent_type');
        createDocInner.resolves(createdDoc);
        isPerson.returns(true);

        const result = await Person.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(getDocByIdInner.calledOnceWithExactly('parent-uuid')).to.be.true;
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.have.property('parent');
      });

      it('creates a person with contact field as string UUID', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const qualifier = { type: 'patient', name: 'Patient', contact: 'contact-uuid' };
        const hydratedContact = { _id: 'contact-uuid' };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'patient',
          name: 'Patient',
          contact: hydratedContact,
          reported_date: 12345
        };

        getPersonTypes.returns([personType]);
        fetchHydratedDocInner.resolves(hydratedContact);
        createDocInner.resolves(createdDoc);
        isPerson.returns(true);

        const result = await Person.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(fetchHydratedDocOuter.calledWith(localContext.medicDb)).to.be.true;
        expect(fetchHydratedDocInner.calledWith('contact-uuid')).to.be.true;
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.have.property('contact');
      });

      it('throws an error if created document is not a valid person', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const qualifier = { type: 'patient', name: 'John Doe' };
        const createdDoc = { _id: 'generated-uuid', _rev: '1-abc', ...qualifier, reported_date: 12345 };

        getPersonTypes.returns([personType]);
        createDocInner.resolves(createdDoc);
        isPerson.returns(false);

        await expect(Person.v1.create(localContext)(qualifier))
          .to.be.rejectedWith(`Created document [${createdDoc._id}] is not a valid person.`);

        expect(isPerson.calledOnceWithExactly(settings, createdDoc)).to.be.true;
      });
    });

    describe('update', () => {
      let updateDocInner: SinonStub;
      let updateDocOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      let getDocByIdOuter: SinonStub;
      let getPersonTypes: SinonStub;
      let getTypeId: SinonStub;
      let fetchHydratedDocInner: SinonStub;
      let fetchHydratedDocOuter: SinonStub;

      beforeEach(() => {
        updateDocInner = sinon.stub();
        updateDocOuter = sinon.stub(LocalDoc, 'updateDoc').returns(updateDocInner);
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
        getPersonTypes = sinon.stub(contactTypeUtils, 'getPersonTypes');
        getTypeId = sinon.stub(contactTypeUtils, 'getTypeId');
        fetchHydratedDocInner = sinon.stub();
        fetchHydratedDocOuter = sinon.stub(Lineage, 'fetchHydratedDoc').returns(fetchHydratedDocInner);
        settingsGetAll.returns(settings);
      });

      it('updates a person successfully', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const existingDoc = {
          _id: 'person-uuid',
          _rev: '1-abc',
          type: 'patient',
          name: 'Old Name',
          reported_date: 12345
        };
        const qualifier = {
          _id: 'person-uuid',
          _rev: '1-abc',
          type: 'patient',
          name: 'New Name',
          reported_date: 12345
        };
        const updatedDoc = { ...qualifier, _rev: '2-def' };

        getPersonTypes.returns([personType]);
        getDocByIdInner.resolves(existingDoc);
        updateDocInner.resolves(updatedDoc);
        isPerson.returns(true);

        const result = await Person.v1.update(localContext)(qualifier);

        expect(result).to.deep.equal(updatedDoc);
        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly('person-uuid')).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocInner.calledOnce).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, updatedDoc)).to.be.true;
      });

      it('throws an error if person type is invalid', async () => {
        const qualifier = { _id: 'person-uuid', _rev: '1-abc', type: 'invalid-type', name: 'Name' };

        getPersonTypes.returns([{ id: 'patient', person: true, parents: [] }]);

        await expect(Person.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('Invalid person type [invalid-type].');

        expect(getPersonTypes.calledOnceWithExactly(settings)).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if _id is not provided', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const qualifier = { _rev: '1-abc', type: 'patient', name: 'Name' };

        getPersonTypes.returns([personType]);

        await expect(Person.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('_id is required for update operations.');

        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if _rev is not provided', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const qualifier = { _id: 'person-uuid', type: 'patient', name: 'Name' };

        getPersonTypes.returns([personType]);

        await expect(Person.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('_rev is required for update operations.');

        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws NotFoundError if document is not found', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const qualifier = { _id: 'person-uuid', _rev: '1-abc', type: 'patient', name: 'Name' };

        getPersonTypes.returns([personType]);
        getDocByIdInner.resolves(null);

        await expect(Person.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(NotFoundError, 'Document [person-uuid] not found.');

        expect(getDocByIdInner.calledOnceWithExactly('person-uuid')).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if type is changed', async () => {
        const personType = { id: 'new-type', person: true, parents: [] };
        const existingDoc = { _id: 'person-uuid', _rev: '1-abc', type: 'old-type', name: 'Name', reported_date: 12345 };
        const qualifier = { _id: 'person-uuid', _rev: '1-abc', type: 'new-type', name: 'Name', reported_date: 12345 };

        getPersonTypes.returns([personType]);
        getDocByIdInner.resolves(existingDoc);

        await expect(Person.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(
            'Field [type] is immutable and cannot be changed. Current value: [old-type], Attempted value: [new-type].'
          );

        expect(getDocByIdInner.calledOnceWithExactly('person-uuid')).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if reported_date is changed', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const existingDoc = {
          _id: 'person-uuid',
          _rev: '1-abc',
          type: 'patient',
          name: 'Name',
          reported_date: 12345
        };
        const qualifier = {
          _id: 'person-uuid',
          _rev: '1-abc',
          type: 'patient',
          name: 'Name',
          reported_date: 99999
        };

        getPersonTypes.returns([personType]);
        getDocByIdInner.resolves(existingDoc);

        await expect(Person.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(
            'Field [reported_date] is immutable and cannot be changed. Current value: [12345], Attempted value: [99999].'
          );

        expect(getDocByIdInner.calledOnceWithExactly('person-uuid')).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws an error if parent is changed', async () => {
        const childType = { id: 'child', person: true, parents: ['parent_type'] };
        const parentType = { id: 'parent_type', person: true, parents: [] };
        const existingDoc = {
          _id: 'person-uuid',
          _rev: '1-abc',
          type: 'child',
          name: 'Name',
          parent: 'old-parent-uuid',
          reported_date: 12345
        };
        const qualifier = {
          _id: 'person-uuid',
          _rev: '1-abc',
          type: 'child',
          name: 'Name',
          parent: 'new-parent-uuid',
          reported_date: 12345
        };
        const parentDoc = { _id: 'new-parent-uuid', type: 'parent_type' };

        getPersonTypes.returns([childType, parentType]);
        getDocByIdInner.withArgs('person-uuid').resolves(existingDoc);
        getDocByIdInner.withArgs('new-parent-uuid').resolves(parentDoc);
        getTypeId.returns('parent_type');

        await expect(Person.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(
            'Field [parent] is immutable and cannot be changed. ' +
            'Current value: [old-parent-uuid], Attempted value: [new-parent-uuid].'
          );

        expect(updateDocInner.notCalled).to.be.true;
      });

      it('updates a person with parent validation', async () => {
        const childType = { id: 'child', person: true, parents: ['parent_type'] };
        const parentType = { id: 'parent_type', person: true, parents: [] };
        const hydratedParent = { _id: 'parent-uuid' };
        const existingDoc = {
          _id: 'person-uuid',
          _rev: '1-abc',
          type: 'child',
          name: 'Old Name',
          parent: 'parent-uuid',
          reported_date: 12345
        };
        const qualifier = {
          _id: 'person-uuid',
          _rev: '1-abc',
          type: 'child',
          name: 'New Name',
          parent: 'parent-uuid',
          reported_date: 12345
        };
        const parentDoc = { _id: 'parent-uuid', type: 'parent_type' };
        const updatedDoc = { ...qualifier, _rev: '2-def', parent: hydratedParent };

        getPersonTypes.returns([childType, parentType]);
        getDocByIdInner.withArgs('person-uuid').resolves(existingDoc);
        getDocByIdInner.withArgs('parent-uuid').resolves(parentDoc);
        getTypeId.returns('parent_type');
        fetchHydratedDocInner.resolves(hydratedParent);
        updateDocInner.resolves(updatedDoc);
        isPerson.returns(true);

        const result = await Person.v1.update(localContext)(qualifier);

        expect(result).to.deep.equal(updatedDoc);
        expect(getTypeId.calledOnceWithExactly(parentDoc)).to.be.true;
        expect(updateDocInner.calledOnce).to.be.true;
      });

      it('throws an error if updated document is not a valid person', async () => {
        const personType = { id: 'patient', person: true, parents: [] };
        const existingDoc = { _id: 'person-uuid', _rev: '1-abc', type: 'patient', name: 'Name', reported_date: 12345 };
        const qualifier = { _id: 'person-uuid', _rev: '1-abc', type: 'patient', name: 'New Name', reported_date: 12345 };
        const updatedDoc = { ...qualifier, _rev: '2-def' };

        getPersonTypes.returns([personType]);
        getDocByIdInner.resolves(existingDoc);
        updateDocInner.resolves(updatedDoc);
        isPerson.returns(false);

        await expect(Person.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(`Updated document [${updatedDoc._id}] is not a valid person.`);

        expect(isPerson.calledOnceWithExactly(settings, updatedDoc)).to.be.true;
      });
    });
  });
});
