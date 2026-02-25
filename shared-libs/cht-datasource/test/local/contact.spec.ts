import * as LocalDataContext from '../../src/local/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { Doc } from '../../src/libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Contact from '../../src/local/contact';
import { expect } from 'chai';
import * as Lineage from '../../src/local/libs/lineage';
import * as Nouveau from '../../src/local/libs/nouveau';
import * as Qualifier from '../../src/qualifier';
import { END_OF_ALPHABET_MARKER } from '../../src/libs/constants';
import { InvalidArgumentError } from '../../src';

describe('local contact', () => {
  let localContext: LocalDataContext.LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let isContact: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext.LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    isContact = sinon.stub(contactTypeUtils, 'isContact');
  });
  
  afterEach(() => sinon.restore());

  describe('v1', () => {
    const settings = { hello: 'world' } as const;

    beforeEach(() => {
      settingsGetAll.returns(settings);
    });

    describe('get', () => {
      const identifier = { uuid: 'uuid' } as const;
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
      });

      it('returns a contact by UUID', async () => {
        const doc = { type: 'person' };
        getDocByIdInner.resolves(doc);
        isContact.returns(true);

        const result = await Contact.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), doc)).to.be.true;
        expect(warn.notCalled).to.be.true;
      });

      it('returns null if the identified doc does not have a contact type', async () => {
        const doc = { type: 'not-contact', _id: '_id' };
        getDocByIdInner.resolves(doc);
        isContact.returns(false);

        const result = await Contact.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), doc)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${doc._id}] is not a valid contact.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Contact.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No contact found for identifier [${identifier.uuid}].`)).to.be.true;
      });

      it('propagates error if getMedicDocById throws an error', async () => {
        const err = new Error('error');
        getDocByIdInner.throws(err);

        await expect(Contact.v1.get(localContext)(identifier)).to.be.rejectedWith('error');

        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(warn.notCalled).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const identifier = { uuid: 'uuid' } as const;
      let mockFetchHydratedDoc: sinon.SinonStub;

      beforeEach(() => {
        mockFetchHydratedDoc = sinon.stub(Lineage, 'fetchHydratedDoc');
      });

      it('returns a contact with lineage for person type contact', async () => {
        const contact = { type: 'person', _id: 'uuid', _rev: 'rev' };
        const mockFunction = sinon.stub().resolves(contact);
        mockFetchHydratedDoc.returns(mockFunction);
        isContact.returns(true);

        const result = await Contact.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(contact);
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), contact)).to.be.true;
      });

      it('returns a contact with lineage for place type contact', async () => {
        const placeContact = { type: 'place', _id: 'place0', _rev: 'rev', 
          contact: { _id: 'contact0', _rev: 'rev' } };
        const mockFunction = sinon.stub().resolves(placeContact);
        mockFetchHydratedDoc.returns(mockFunction);
        isContact.returns(true);

        const result = await Contact.v1.getWithLineage(localContext)(identifier);

        expect(result).to.equal(placeContact);
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), placeContact)).to.be.true;
      });

      it('returns null when no contact or lineage is found', async () => {
        const mockFunction = sinon.stub().resolves(null);
        mockFetchHydratedDoc.returns(mockFunction);

        const result = await Contact.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.notCalled).to.be.true;
      });

      it('returns null if the doc returned is not a contact', async () => {
        const notContact = { type: 'not-person', _id: 'uuid', _rev: 'rev' };
        const mockFunction = sinon.stub().resolves(notContact);
        mockFetchHydratedDoc.returns(mockFunction);
        isContact.returns(false);

        const result = await Contact.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(isContact.calledOnceWithExactly(settingsGetAll(), notContact)).to.be.true;
      });
    });

    describe('getUuidsPage', () => {
      const limit = 3;
      const contactType = 'person';
      const expectedResult = { cursor: 'bookmark', data: ['1', '2', '3'] };
      let queryViewByType: SinonStub;
      let queryViewFreetextByKey: SinonStub;
      let queryViewFreetextByRange: SinonStub;
      let queryViewTypeFreetextByKey: SinonStub;
      let queryViewTypeFreetextByRange: SinonStub;
      let fetchAndFilterIdsInner: SinonStub;
      let fetchAndFilterIdsOuter: SinonStub;
      let queryNouveauFreetext: SinonStub;
      let useNouveauIndexes: SinonStub;
      let getContactTypeIds: SinonStub;

      beforeEach(() => {
        getContactTypeIds = sinon.stub(contactTypeUtils, 'getContactTypeIds').returns([contactType]);

        queryViewByType = sinon.stub();
        queryViewFreetextByKey = sinon.stub();
        queryViewTypeFreetextByKey = sinon.stub();
        const queryDocIdsByKeyStub = sinon.stub(LocalDoc, 'queryDocIdsByKey');
        queryDocIdsByKeyStub
          .withArgs(localContext.medicDb, 'medic-client/contacts_by_type')
          .returns(queryViewByType);
        queryDocIdsByKeyStub
          .withArgs(localContext.medicDb, 'medic-offline-freetext/contacts_by_freetext')
          .returns(queryViewFreetextByKey);
        queryDocIdsByKeyStub
          .withArgs(localContext.medicDb, 'medic-offline-freetext/contacts_by_type_freetext')
          .returns(queryViewTypeFreetextByKey);

        queryViewFreetextByRange = sinon.stub();
        queryViewTypeFreetextByRange = sinon.stub();
        const queryDocIdsByRangeStub = sinon.stub(LocalDoc, 'queryDocIdsByRange');
        queryDocIdsByRangeStub
          .withArgs(localContext.medicDb, 'medic-offline-freetext/contacts_by_freetext')
          .returns(queryViewFreetextByRange);
        queryDocIdsByRangeStub
          .withArgs(localContext.medicDb, 'medic-offline-freetext/contacts_by_type_freetext')
          .returns(queryViewTypeFreetextByRange);

        fetchAndFilterIdsInner = sinon.stub();
        fetchAndFilterIdsOuter = sinon
          .stub(LocalDoc, 'fetchAndFilterIds')
          .returns(fetchAndFilterIdsInner);

        queryNouveauFreetext = sinon.stub();
        sinon
          .stub(Nouveau, 'queryByFreetext')
          .withArgs(localContext.medicDb, 'contacts_by_freetext')
          .returns(queryNouveauFreetext);

        useNouveauIndexes = sinon.stub(Nouveau, 'useNouveauIndexes');
      });

      describe('contact type qualifier', () => {
        beforeEach(() => {
          useNouveauIndexes.resolves(false);
          fetchAndFilterIdsInner.resolves(expectedResult);
        });

        ([
          [null, 0],
          ['1', 1]
        ] as [string | null, number][]).forEach(([cursor, skip]) => {
          it(`returns page of UUIDs for valid contact type with cursor [${cursor}]`, async () => {
            const qualifier = Qualifier.byContactType(contactType);

            const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

            expect(res).to.deep.equal(expectedResult);
            expect(getContactTypeIds.calledOnceWithExactly(settings)).to.be.true;
            expect(queryNouveauFreetext.notCalled).to.be.true;
            expect(queryViewFreetextByKey.notCalled).to.be.true;
            expect(queryViewFreetextByRange.notCalled).to.be.true;
            expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
            expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
            expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
            expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, skip)).to.be.true;
            // Verify the page function uses the contacts_by_type view
            const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
            pageFn(limit, skip);

            expect(queryViewByType.calledWithExactly([contactType], limit, skip)).to.be.true;
          });
        });

        it('throws for invalid contact type', async () => {
          getContactTypeIds.returns(['not-person']);
          const qualifier = Qualifier.byContactType(contactType);

          await expect(Contact.v1.getUuidsPage(localContext)(qualifier, null, limit))
            .to.be.rejectedWith(InvalidArgumentError, `Invalid contact type [${contactType}].`);

          expect(getContactTypeIds.calledOnceWithExactly(settings)).to.be.true;
          expect(queryNouveauFreetext.notCalled).to.be.true;
          expect(queryViewFreetextByKey.notCalled).to.be.true;
          expect(queryViewFreetextByRange.notCalled).to.be.true;
          expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
          expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
          expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
          expect(fetchAndFilterIdsInner.notCalled).to.be.true;
        });

        it('throws for invalid cursor', async () => {
          const qualifier = Qualifier.byContactType(contactType);
          const cursor = 'not a number';

          await expect(Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit))
            .to.be.rejectedWith(
              InvalidArgumentError,
              `The cursor must be a string or null for first page: [${JSON.stringify(cursor)}]`
            );

          expect(getContactTypeIds.calledOnceWithExactly(settings)).to.be.true;
          expect(queryNouveauFreetext.notCalled).to.be.true;
          expect(queryViewFreetextByKey.notCalled).to.be.true;
          expect(queryViewFreetextByRange.notCalled).to.be.true;
          expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
          expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
          expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
          expect(fetchAndFilterIdsInner.notCalled).to.be.true;
        });
      });

      describe('freetext qualifier', () => {
        describe('when useNouveauIndexes is true', () => {
          beforeEach(() => {
            queryNouveauFreetext.resolves(expectedResult);
            useNouveauIndexes.resolves(true);
          });

          ([
            ['searching with a keyed value and no cursor', null, 'key:value'],
            ['searching with a keyed value and a cursor', 'cursor', 'key:value'],
            ['searching with a prefix qualifier and no cursor', null, 'searchterm'],
            ['searching with a prefix qualifier and a cursor', 'cursor', 'searchterm']
          ] as [string, string | null, string][]).forEach(([test, cursor, freetext]) => {
            it(`uses nouveau for freetext searches when ${test}`, async () => {
              const qualifier = Qualifier.byFreetext(freetext);

              const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

              expect(res).to.deep.equal(expectedResult);
              expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
              expect(queryNouveauFreetext.calledOnceWithExactly(qualifier, cursor, limit)).to.be.true;
              expect(getContactTypeIds.notCalled).to.be.true;
              expect(queryViewByType.notCalled).to.be.true;
              expect(queryViewFreetextByKey.notCalled).to.be.true;
              expect(queryViewFreetextByRange.notCalled).to.be.true;
              expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
              expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
              expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
              expect(fetchAndFilterIdsInner.notCalled).to.be.true;
            });
          });

          it('normalizes freetext qualifier before querying nouveau', async () => {
            const freetext = '  HAS:DELIMITER  ';
            const qualifier = Qualifier.byFreetext(freetext);

            const res = await Contact.v1.getUuidsPage(localContext)(qualifier, null, limit);

            expect(res).to.deep.equal(expectedResult);
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.calledOnceWithExactly(
              Qualifier.byFreetext('has:delimiter'),
              null,
              limit
            )).to.be.true;
            expect(getContactTypeIds.notCalled).to.be.true;
            expect(queryViewByType.notCalled).to.be.true;
            expect(queryViewFreetextByKey.notCalled).to.be.true;
            expect(queryViewFreetextByRange.notCalled).to.be.true;
            expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
            expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
            expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
            expect(fetchAndFilterIdsInner.notCalled).to.be.true;
          });

          it('uses nouveau for combined freetext and contact type qualifier', async () => {
            const freetext = 'key:value';
            const qualifier = Qualifier.and(
              Qualifier.byContactType(contactType),
              Qualifier.byFreetext(freetext)
            );

            const res = await Contact.v1.getUuidsPage(localContext)(qualifier, null, limit);

            expect(res).to.deep.equal(expectedResult);
            expect(getContactTypeIds.calledOnceWithExactly(settings)).to.be.true;
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.calledOnceWithExactly(qualifier, null, limit)).to.be.true;
            expect(queryViewByType.notCalled).to.be.true;
            expect(queryViewFreetextByKey.notCalled).to.be.true;
            expect(queryViewFreetextByRange.notCalled).to.be.true;
            expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
            expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
            expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
            expect(fetchAndFilterIdsInner.notCalled).to.be.true;
          });

          it('throws for invalid contact type in combined qualifier', async () => {
            getContactTypeIds.returns(['not-person']);
            const qualifier = Qualifier.and(
              Qualifier.byContactType(contactType),
              Qualifier.byFreetext('key:value')
            );

            await expect(Contact.v1.getUuidsPage(localContext)(qualifier, null, limit))
              .to.be.rejectedWith(InvalidArgumentError, `Invalid contact type [${contactType}].`);

            expect(getContactTypeIds.calledOnceWithExactly(settings)).to.be.true;
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.notCalled).to.be.true;
            expect(queryViewByType.notCalled).to.be.true;
            expect(queryViewFreetextByKey.notCalled).to.be.true;
            expect(queryViewFreetextByRange.notCalled).to.be.true;
            expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
            expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
            expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
            expect(fetchAndFilterIdsInner.notCalled).to.be.true;
          });
        });

        describe('when useNouveauIndexes is false', () => {
          beforeEach(() => {
            useNouveauIndexes.resolves(false);
            fetchAndFilterIdsInner.resolves(expectedResult);
          });

          ([
            [null, 0],
            ['1', 1]
          ] as [string | null, number][]).forEach(([cursor, skip]) => {
            it(`uses offline views for freetext keyed qualifier with cursor [${cursor}]`, async () => {
              const freetext = 'key:value';
              const qualifier = Qualifier.byFreetext(freetext);

              const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

              expect(res).to.deep.equal(expectedResult);
              expect(getContactTypeIds.notCalled).to.be.true;
              expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
              expect(queryNouveauFreetext.notCalled).to.be.true;
              expect(queryViewFreetextByRange.notCalled).to.be.true;
              expect(queryViewByType.notCalled).to.be.true;
              expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
              expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
              expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
              expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
              expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, skip)).to.be.true;
              // Verify the page function uses the keyed freetext view
              const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
              pageFn(limit, skip);

              expect(queryViewFreetextByKey.calledWithExactly([freetext], limit, skip)).to.be.true;
            });

            it(`uses offline views for freetext prefix qualifier with cursor [${cursor}]`, async () => {
              const freetext = 'searchterm';
              const qualifier = Qualifier.byFreetext(freetext);

              const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

              expect(res).to.deep.equal(expectedResult);
              expect(getContactTypeIds.notCalled).to.be.true;
              expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
              expect(queryNouveauFreetext.notCalled).to.be.true;
              expect(queryViewFreetextByKey.notCalled).to.be.true;
              expect(queryViewByType.notCalled).to.be.true;
              expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
              expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
              expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
              expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
              expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, skip)).to.be.true;
              // Verify the page function uses the range freetext view
              const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
              pageFn(limit, skip);

              expect(queryViewFreetextByRange.calledWithExactly(
                [freetext],
                [freetext + END_OF_ALPHABET_MARKER],
                limit,
                skip
              )).to.be.true;
            });

            it(`uses offline views for combined keyed freetext and contact type with cursor [${cursor}]`, async () => {
              const freetext = 'key:value';
              const qualifier = Qualifier.and(
                Qualifier.byContactType(contactType),
                Qualifier.byFreetext(freetext)
              );

              const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

              expect(res).to.deep.equal(expectedResult);
              expect(getContactTypeIds.calledOnceWithExactly(settings)).to.be.true;
              expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
              expect(queryNouveauFreetext.notCalled).to.be.true;
              expect(queryViewByType.notCalled).to.be.true;
              expect(queryViewFreetextByKey.notCalled).to.be.true;
              expect(queryViewFreetextByRange.notCalled).to.be.true;
              expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
              expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
              expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
              expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, skip)).to.be.true;
              // Verify the page function uses the keyed type freetext view
              const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
              pageFn(limit, skip);

              expect(queryViewTypeFreetextByKey.calledWithExactly(
                [contactType, freetext], limit, skip
              )).to.be.true;
            });

            it(`uses offline views for combined prefix freetext and contact type with cursor [${cursor}]`, async () => {
              const freetext = 'searchterm';
              const qualifier = Qualifier.and(
                Qualifier.byContactType(contactType),
                Qualifier.byFreetext(freetext)
              );

              const res = await Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

              expect(res).to.deep.equal(expectedResult);
              expect(getContactTypeIds.calledOnceWithExactly(settings)).to.be.true;
              expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
              expect(queryNouveauFreetext.notCalled).to.be.true;
              expect(queryViewByType.notCalled).to.be.true;
              expect(queryViewFreetextByKey.notCalled).to.be.true;
              expect(queryViewFreetextByRange.notCalled).to.be.true;
              expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
              expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
              expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
              expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, skip)).to.be.true;
              // Verify the page function uses the range type freetext view
              const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
              pageFn(limit, skip);

              expect(queryViewTypeFreetextByRange.calledWithExactly(
                [contactType, freetext],
                [contactType, freetext + END_OF_ALPHABET_MARKER],
                limit,
                skip
              )).to.be.true;
            });
          });

          it('normalizes freetext qualifier before querying', async () => {
            const freetext = '  HAS:DELIMITER  ';
            const qualifier = Qualifier.byFreetext(freetext);

            const res = await Contact.v1.getUuidsPage(localContext)(qualifier, null, limit);

            expect(res).to.deep.equal(expectedResult);
            expect(getContactTypeIds.notCalled).to.be.true;
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.notCalled).to.be.true;
            expect(queryViewFreetextByRange.notCalled).to.be.true;
            expect(queryViewByType.notCalled).to.be.true;
            expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
            expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
            expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
            expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
            expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, 0)).to.be.true;
            // Verify the page function uses the keyed freetext view with normalized value
            const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
            pageFn(limit, 0);

            expect(queryViewFreetextByKey.calledWithExactly(['has:delimiter'], limit, 0)).to.be.true;
          });

          it('throws an error if cursor is invalid', async () => {
            const qualifier = Qualifier.byFreetext('key:value');
            const cursor = 'not a number';

            await expect(Contact.v1.getUuidsPage(localContext)(qualifier, cursor, limit))
              .to.be.rejectedWith(
                InvalidArgumentError,
                `The cursor must be a string or null for first page: [${JSON.stringify(cursor)}]`
              );

            expect(getContactTypeIds.notCalled).to.be.true;
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.notCalled).to.be.true;
            expect(queryViewByType.notCalled).to.be.true;
            expect(queryViewFreetextByKey.notCalled).to.be.true;
            expect(queryViewFreetextByRange.notCalled).to.be.true;
            expect(queryViewTypeFreetextByKey.notCalled).to.be.true;
            expect(queryViewTypeFreetextByRange.notCalled).to.be.true;
            expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
            expect(fetchAndFilterIdsInner.notCalled).to.be.true;
          });
        });
      });
    });
  });
});
