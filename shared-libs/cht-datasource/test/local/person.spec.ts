import sinon, { SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as Person from '../../src/local/person';
import * as PersonTypes from '../../src/person';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Lineage from '../../src/local/libs/lineage';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';
import * as LocalCore from '../../src/local/libs/core';
import * as Input from '../../src/input';

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
      let getDocByIdInner: SinonStub;
      let updateDocOuter: SinonStub;
      let updateDocInner: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        sinon.stub(Person.v1, 'get').returns(getDocByIdInner);
        updateDocOuter = sinon.stub(LocalDoc, 'updateDoc');
        updateDocInner = sinon.stub();
        updateDocOuter.returns(updateDocInner);
      });

      it('throws error for missing _id or _rev', async () => {
        settingsGetAll.returns({});
        const updateDoc = {
          type: 'person',
          parent: { _id: 'p1' },
          name: 'apoorva2'
        };
        await expect(Person.v1.update(localContext)(updateDoc as unknown as PersonTypes.v1.Person))
          .to.be.rejectedWith('Valid _id, _rev, and type fields must be provided.');
      });

      it('updates doc for valid update input', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          reported_date: 12312312,
          parent: {
            _id: '1', parent: {
              _id: '2'
            }
          },
          name: 'apoorva2',
          _id: '1',
          _rev: '1'
        };

        const originalDoc = {
          ...updateDocInput, name: 'apoorva', parent: { _id: '1', parent: { _id: '2' } }
        };
        getDocByIdInner.resolves(originalDoc);
        updateDocInner.resolves({ _rev: '2' });

        const result = await Person.v1.update(localContext)(updateDocInput);

        expect(updateDocInner.calledOnce).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(result).to.deep.equal({ ...updateDocInput, name: 'apoorva2', _rev: '2' });
      });

      it('throws error for non-existent person', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          parent: { _id: 'p1' },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
          reported_date: new Date(12312312)
        };

        getDocByIdInner.resolves(null);

        await expect(Person.v1.update(localContext)(updateDocInput as unknown as PersonTypes.v1.Person))
          .to.be.rejectedWith(`Person record [1] not found.`);

        expect(updateDocOuter.called).to.be.true;
        expect(updateDocInner.called).to.be.false;
      });

      it('deletes keys from original doc if they are not required', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
        const reportedDate = 12312312;
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          parent: {
            _id: 'p1'
          },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
          reported_date: reportedDate
        };

        const originalDoc = { ...updateDocInput, hobby: 'skating', sex: 'male' };
        getDocByIdInner.resolves(originalDoc);
        updateDocInner.resolves({ _rev: '2' });

        const result = await Person.v1.update(localContext)(updateDocInput);
        expect(result).to.deep.equal({ ...updateDocInput, _rev: '2' });
        expect(updateDocInner.calledOnce).to.be.true;
      });

      it('throw error is _rev does not match with the _rev in the original doc', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          reported_date: 12312312,
          parent: { _id: 'p1' },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
        };

        const originalDoc = { ...updateDocInput, _rev: '2' };
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be.rejectedWith('The [_rev] field must not be changed.');
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error if parent lineage of input does not match with originalDoc', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
          reported_date: 12312312
        };
        const originalDoc = {
          ...updateDocInput, parent: {
            _id: 'p1',
            parent: {
              _id: 'p3'
            }
          }
        };
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith('Parent lineage does not match.');
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error if parent lineage depth of input does not match with originalDoc', async () => {
        settingsGetAll.returns({});
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          reported_date: 12312312,
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          },
          name: 'apoorva2',
          _id: '1',
          _rev: '1',
        };
        const originalDoc = {
          ...updateDocInput, parent: {
            _id: 'p1',
            parent: {
              _id: 'p2',
              parent: {
                _id: 'p3'
              }
            }
          }
        };
        getDocByIdInner.resolves(originalDoc);
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith('Parent lineage does not match.');
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for missing required mutable fields', async () => {
        // isPerson must return true to get past initial validation
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          reported_date: new Date(12312312),
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          },
          _id: '1',
          _rev: '1',
        };
        const originalDoc = {
          ...updateDocInput,
          name: 'apoorva'
        };
        getDocByIdInner.resolves(originalDoc);
        // Error message changed to assertHasRequiredField format
        await expect(Person.v1.update(localContext)(updateDocInput as unknown as PersonTypes.v1.Person))
          .to.be
          .rejectedWith(`The [name] field must have a [string] value.`);
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for missing required immutable fields other than parent', async () => {
        // isPerson must return true to get past initial validation
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          name: 'apoorva',
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          },
          _id: '1',
          _rev: '1'
        };
        const originalDoc = {
          ...updateDocInput,
          reported_date: new Date(12312312),
        };
        getDocByIdInner.resolves(originalDoc);
        // Missing reported_date is treated as "changed" field
        await expect(Person.v1.update(localContext)(updateDocInput as unknown as PersonTypes.v1.Person))
          .to.be
          .rejectedWith(`The [reported_date] field must not be changed.`);
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for missing required immutable field: parent', async () => {
        // isPerson must return true to get past initial validation
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          _id: '1',
          _rev: '1',
          reported_date: new Date(555)
        };
        const originalDoc = {
          ...updateDocInput,
          parent: {
            _id: '-1'
          },
        };
        getDocByIdInner.resolves(originalDoc);
        // When parent is missing from update but exists in original, lineage check fails
        await expect(Person.v1.update(localContext)(updateDocInput as unknown as PersonTypes.v1.Person))
          .to.be
          .rejectedWith(`Parent lineage does not match.`);
        expect(updateDocInner.called).to.be.false;
      });

      it('throw error for updated required immutable fields other than parent', async () => {
        // isPerson must return true to get past initial validation
        isPerson.returns(true);
        const updateDocInput = {
          type: 'contact',
          contact_type: 'person',
          name: 'apoorva',
          parent: {
            _id: 'p1',
            parent: {
              _id: 'p2'
            }
          },
          _id: '1',
          _rev: '1',
          reported_date: 333444555,
        };
        const originalDoc = {
          ...updateDocInput,
          reported_date: new Date(12312312),
        };
        getDocByIdInner.resolves(originalDoc);
        // Error message changed to use assertFieldsUnchanged format
        await expect(Person.v1.update(localContext)(updateDocInput))
          .to.be
          .rejectedWith(`The [reported_date] field must not be changed.`);
        expect(updateDocInner.called).to.be.false;
      });
    });
  });
});
