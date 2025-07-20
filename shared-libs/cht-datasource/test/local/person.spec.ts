import sinon, { SinonStub } from 'sinon';
import contactTypeUtils from '@medic/contact-types-utils';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as Person from '../../src/local/person';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Lineage from '../../src/local/libs/lineage';
import { expect } from 'chai';
import { LocalDataContext } from '../../src/local/libs/data-context';

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
        expect(result).to.deep.equal(personWithLineage);
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

      it('returns a person if no lineage is found', async () => {
        const person = { type: 'person', _id: 'uuid', _rev: 'rev' };
        const mockFunction = sinon.stub().resolves(person);
        mockFetchHydratedDoc.returns(mockFunction);
        isPerson.returns(true);
        settingsGetAll.returns(settings);

        const result = await Person.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(person);
        expect(result).to.deep.equal(person);
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isPerson.calledOnceWithExactly(settings, person)).to.be.true;
        expect(warn.notCalled).to.be.true;
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
          expect(queryDocsByKeyOuter.calledOnceWithExactly(localContext.medicDb, 'medic-client/contacts_by_type'))
            .to.be.true;
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
  });
});
