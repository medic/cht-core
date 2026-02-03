import sinon, { SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as Qualifier from '../../src/qualifier';
import * as Person from '../../src/local/person';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Lineage from '../../src/local/libs/lineage';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';
import * as LocalCore from '../../src/local/libs/core';
import * as Input from '../../src/input';
import { InvalidArgumentError, ResourceNotFoundError } from '../../src';

describe('local person', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let debug: SinonStub;
  let isPerson: SinonStub;
  let isPersonType: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    debug = sinon.stub(logger, 'debug');
    isPerson = sinon.stub(contactTypeUtils, 'isPerson');
    isPersonType = sinon.stub(contactTypeUtils, 'isPersonType');
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
        const doc = { type: 'person', _id: 'uuid', _rev: '1' };
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
        const doc = { type: 'not-person', _id: '_id', _rev: '1' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);
        isPerson.returns(false);

        const result = await Person.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, doc)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid person.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Person.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(isPerson.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid person.`)).to.be.true;
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
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid person.`)).to.be.true;
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
      const personTypeQualifier = { contactType: personIdentifier } as const;
      const invalidPersonTypeQualifier = { contactType: 'invalid' } as const;
      const personType = [{ person: true, id: personIdentifier }] as Record<string, unknown>[];
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
        const doc = { type: 'person' };
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
        const doc = { type: 'person' };
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
      ].forEach((invalidSkip) => {
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

    describe('createPerson', () => {
      const minifiedParent = {
        _id: 'p1',
        parent: { _id: 'p2' }
      } as const;
      const parent = {
        ...minifiedParent,
        _rev: '1',
        type: 'clinic'
      } as const;
      const personDoc = { hello: 'world' };

      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      let createDocOuter: SinonStub;
      let createDocInner: SinonStub;
      let getTypeById: SinonStub;
      let getReportedDateTimestamp: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
        createDocInner = sinon.stub().resolves(personDoc);
        createDocOuter = sinon.stub(LocalDoc, 'createDoc').returns(createDocInner);
        settingsGetAll.returns(settings);
        getTypeById = sinon.stub(contactTypeUtils, 'getTypeById');
        isPersonType.returns(true);
        getReportedDateTimestamp = sinon.stub(LocalCore, 'getReportedDateTimestamp');
      });

      it('throws error if input validation fails', async () => {
        const input = {
          name: 'user-1',
          type: 'person',
          _rev: '1-rev',
          parent: 'p1'
        };

        await expect(
          Person.v1.create(localContext)(input as unknown as Input.v1.PersonInput)
        ).to.be.rejectedWith('The [_rev] field must not be set.');

        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(getTypeById.notCalled).to.be.true;
        expect(isPersonType.notCalled).to.be.true;
        expect(getDocByIdInner.notCalled).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      [
        { id: 'not-person' }, // Custom type
        null // Default type
      ].forEach((typeData) => {
        it('throws error if input type is not a `person`', async () => {
          getTypeById.returns(typeData);
          isPersonType.returns(false);
          const personInput = {
            type: 'not-person',
            name: 'user-1',
            parent: 'p1'
          };

          await expect(Person.v1.create(localContext)(personInput))
            .to.be.rejectedWith('[not-person] is not a valid person type.');

          expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
          expect(getTypeById.calledOnceWithExactly(settings, personInput.type)).to.be.true;
          expect(isPersonType.calledOnceWithExactly({ id: 'not-person' })).to.be.true;
          expect(getDocByIdInner.notCalled).to.be.true;
          expect(getReportedDateTimestamp.notCalled).to.be.true;
          expect(createDocInner.notCalled).to.be.true;
        });
      });

      it('creates a person with default `person` type', async () => {
        const input = {
          name: 'user-1',
          type: 'person',
          parent: parent._id,
        };
        getDocByIdInner.resolves(parent);
        const reportedDate = new Date().getTime();
        getReportedDateTimestamp.returns(reportedDate);

        const person = await Person.v1.create(localContext)(input);

        expect(person).to.equal(personDoc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
        expect(getTypeById.args).to.deep.equal([[settings, input.type], [settings, input.type]]);
        expect(isPersonType.calledOnceWithExactly({ id: input.type })).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(input.parent)).to.be.true;
        expect(getReportedDateTimestamp.calledOnceWithExactly(undefined)).to.be.true;
        expect(createDocInner.calledOnceWithExactly({
          ...input,
          parent: minifiedParent,
          reported_date: reportedDate
        })).to.be.true;
      });

      it('creates a person with custom `person` type', async () => {
        const customPersonType = { id: 'custom-person', person: true, parents: [parent.type] };
        const input = {
          name: 'user-1',
          type: customPersonType.id,
          parent: parent._id,
          reported_date: 123445566
        };
        getTypeById.returns(customPersonType);
        getDocByIdInner.resolves(parent);
        const reportedDate = new Date().getTime();
        getReportedDateTimestamp.returns(reportedDate);

        const person = await Person.v1.create(localContext)(input);

        expect(person).to.equal(personDoc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
        expect(getTypeById.args).to.deep.equal([[settings, input.type], [settings, input.type]]);
        expect(isPersonType.calledOnceWithExactly(customPersonType)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(input.parent)).to.be.true;
        expect(getReportedDateTimestamp.calledOnceWithExactly(input.reported_date)).to.be.true;
        expect(createDocInner.calledOnceWithExactly({
          ...input,
          type: 'contact',
          contact_type: customPersonType.id,
          parent: minifiedParent,
          reported_date: reportedDate
        })).to.be.true;
      });

      it('throws error when parent doc is not found', async () => {
        const input = {
          name: 'user-1',
          type: 'person',
          parent: parent._id,
        };
        getDocByIdInner.resolves(null);

        await expect(Person.v1.create(localContext)(input))
          .to.be.rejectedWith(`Parent contact [${input.parent}] not found.`);

        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
        expect(getTypeById.calledOnceWithExactly(settings, input.type)).to.be.true;
        expect(isPersonType.calledOnceWithExactly({ id: input.type })).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(input.parent)).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws error when parent type is invalid', async () => {
        const input = {
          name: 'user-1',
          type: 'person',
          parent: parent._id,
        };
        getDocByIdInner.resolves({ ...parent, type: 'person' });
        const reportedDate = new Date().getTime();
        getReportedDateTimestamp.returns(reportedDate);

        await expect(Person.v1.create(localContext)(input))
          .to.be.rejectedWith(`Parent contact of type [person] is not allowed for type [person].`);

        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
        expect(getTypeById.args).to.deep.equal([[settings, input.type], [settings, input.type]]);
        expect(isPersonType.calledOnceWithExactly({ id: input.type })).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(input.parent)).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });
    });

    describe('updatePerson', () => {
      const originalDoc = {
        _id: 'person-1',
        _rev: '1-rev',
        name: 'apoorva',
        type: 'person',
        reported_date: 12312312,
        parent: {
          _id: 'parent-1',
          parent: {
            _id: 'parent-2'
          }
        },
        hello: 'world'
      } as const;

      let getPersonInner: SinonStub;
      let getPersonOuter: SinonStub;
      let updateDocOuter: SinonStub;
      let updateDocInner: SinonStub;
      let assertSameParentLineage: SinonStub;

      beforeEach(() => {
        getPersonInner = sinon.stub();
        getPersonOuter = sinon.stub(Person.v1, 'get').returns(getPersonInner);
        updateDocOuter = sinon.stub(LocalDoc, 'updateDoc');
        updateDocInner = sinon.stub();
        updateDocOuter.returns(updateDocInner);
        settingsGetAll.returns(settings);
        isPerson.returns(true);
        assertSameParentLineage = sinon.stub(Lineage, 'assertSameParentLineage');
      });

      it('updates doc for valid update input', async () => {
        const updateDocInput = {
          ...originalDoc,
          name: 'apoorva2',
          hello: undefined,
          world: 'hello'
        };
        getPersonInner.resolves(originalDoc);
        updateDocInner.resolves({ _rev: '2' });

        const result = await Person.v1.update(localContext)(updateDocInput);

        expect(result).to.deep.equal({ ...updateDocInput, _rev: '2' });
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getPersonOuter.calledOnceWithExactly(localContext)).to.be.true;
        expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
        expect(getPersonInner.calledOnceWithExactly(Qualifier.byUuid(originalDoc._id))).to.be.true;
        expect(assertSameParentLineage.calledOnceWithExactly(originalDoc, updateDocInput)).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateDocInput)).to.be.true;
      });

      [
        { ...originalDoc, _id: undefined },
        { ...originalDoc, _rev: undefined },
      ].forEach((updateDocInput) => {
        it('throws error if input type is not a doc', async () => {
          await expect(Person.v1.update(localContext)(updateDocInput as unknown as Input.v1.UpdatePersonInput))
            .to.be.rejectedWith(InvalidArgumentError, 'Valid _id, _rev, and type fields must be provided.');

          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getPersonOuter.calledOnceWithExactly(localContext)).to.be.true;
          expect(settingsGetAll.notCalled).to.be.true;
          expect(getPersonInner.notCalled).to.be.true;
          expect(assertSameParentLineage.notCalled).to.be.true;
          expect(updateDocInner.notCalled).to.be.true;
        });
      });

      it('throws error if input does not have a person type', async () => {
        isPerson.returns(false);

        await expect(Person.v1.update(localContext)(originalDoc))
          .to.be.rejectedWith(InvalidArgumentError, 'Valid _id, _rev, and type fields must be provided.');

        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getPersonOuter.calledOnceWithExactly(localContext)).to.be.true;
        expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
        expect(getPersonInner.notCalled).to.be.true;
        expect(assertSameParentLineage.notCalled).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws error when no person found', async () => {
        getPersonInner.resolves(null);

        await expect(Person.v1.update(localContext)(originalDoc))
          .to.be.rejectedWith(ResourceNotFoundError, `Person record [${originalDoc._id}] not found.`);

        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getPersonOuter.calledOnceWithExactly(localContext)).to.be.true;
        expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
        expect(getPersonInner.calledOnceWithExactly(Qualifier.byUuid(originalDoc._id))).to.be.true;
        expect(assertSameParentLineage.notCalled).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      ([
        ['_rev', { ...originalDoc, _rev: 'updated' }],
        ['reported_date', { ...originalDoc, reported_date: 'updated' }],
        ['type', { ...originalDoc, type: 'updated' }],
        ['contact_type', { ...originalDoc, contact_type: 'updated' }],
      ] as [string, Input.v1.UpdatePersonInput][]).forEach(([field, updateDocInput]) => {
        it(`throws error when changing immutable field [${field}]`, async () => {
          getPersonInner.resolves(originalDoc);

          await expect(Person.v1.update(localContext)(updateDocInput))
            .to.be.rejectedWith(InvalidArgumentError, `The [${field}] field must not be changed.`);

          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getPersonOuter.calledOnceWithExactly(localContext)).to.be.true;
          expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
          expect(getPersonInner.calledOnceWithExactly(Qualifier.byUuid(originalDoc._id))).to.be.true;
          expect(assertSameParentLineage.notCalled).to.be.true;
          expect(updateDocInner.notCalled).to.be.true;
        });
      });

      it('throws error when trying to remove name value', async () => {
        getPersonInner.resolves(originalDoc);
        const updateDocInput = { ...originalDoc, name: undefined };

        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be.rejectedWith(InvalidArgumentError, `The [name] field must have a [string] value.`);

        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getPersonOuter.calledOnceWithExactly(localContext)).to.be.true;
        expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
        expect(getPersonInner.calledOnceWithExactly(Qualifier.byUuid(originalDoc._id))).to.be.true;
        expect(assertSameParentLineage.notCalled).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });


      [
        { name: 'new name' }, // Set name
        { world: 'hello' } // Set custom value and leave name unset
      ].forEach(updated => {
        it('updates person that does not have an existing name value', async () => {
          const origDocWithoutName = {
            ...originalDoc,
            name: undefined
          };
          const updateDocInput = {
            ...origDocWithoutName,
            ...updated,
          };
          getPersonInner.resolves(origDocWithoutName);
          updateDocInner.resolves({ _rev: '2' });

          const result = await Person.v1.update(localContext)(updateDocInput);

          expect(result).to.deep.equal({ ...updateDocInput, _rev: '2' });
          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getPersonOuter.calledOnceWithExactly(localContext)).to.be.true;
          expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
          expect(getPersonInner.calledOnceWithExactly(Qualifier.byUuid(originalDoc._id))).to.be.true;
          expect(assertSameParentLineage.calledOnceWithExactly(origDocWithoutName, updateDocInput)).to.be.true;
          expect(updateDocInner.calledOnceWithExactly(updateDocInput)).to.be.true;
        });
      });

      it('updates person when lineage data included', async () => {
        const updateDocInput = {
          ...originalDoc,
          name: 'newName',
          parent: {
            _id: 'parent-1',
            name: 'Parent',
            parent: {
              _id: 'parent-2',
              name: 'Grandparent'
            }
          },
        };
        getPersonInner.resolves(originalDoc);
        updateDocInner.resolves({ _rev: '2' });

        const result = await Person.v1.update(localContext)(updateDocInput);

        // Full lineage data returned
        expect(result).to.deep.equal({ ...updateDocInput, _rev: '2' });
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getPersonOuter.calledOnceWithExactly(localContext)).to.be.true;
        expect(settingsGetAll.calledOnceWithExactly()).to.be.true;
        expect(getPersonInner.calledOnceWithExactly(Qualifier.byUuid(originalDoc._id))).to.be.true;
        expect(assertSameParentLineage.calledOnceWithExactly(originalDoc, updateDocInput)).to.be.true;
        // Minified lineage set on updated doc
        expect(updateDocInner.calledOnceWithExactly({ ...updateDocInput, parent: originalDoc.parent })).to.be.true;
      });
    });
  });
});
