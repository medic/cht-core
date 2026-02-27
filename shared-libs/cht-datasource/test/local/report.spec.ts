import * as LocalDataContext from '../../src/local/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { Doc } from '../../src/libs/doc';
import logger from '@medic/logger';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Nouveau from '../../src/local/libs/nouveau';
import * as Report from '../../src/local/report';
import * as Qualifier from '../../src/qualifier';
import { expect } from 'chai';
import { END_OF_ALPHABET_MARKER } from '../../src/libs/constants';
import * as Lineage from '../../src/local/libs/lineage';
import { InvalidArgumentError } from '../../src';

describe('local report', () => {
  let localContext: LocalDataContext.LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext.LocalDataContext;
    warn = sinon.stub(logger, 'warn');
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

      it('returns a report by UUID', async () => {
        const doc = { type: 'data_record', form: 'yes' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);

        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(warn.notCalled).to.be.true;
      });

      it('returns null if the identified doc does not have a record type', async () => {
        const doc = { type: 'not-data-record', _id: '_id' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);

        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${doc._id}] is not a report.`)).to.be.true;
      });

      it('returns null if the identified doc does not have a form field', async () => {
        const doc = { type: 'data_record', _id: '_id' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);

        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${doc._id}] is not a report.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No report found for identifier [${identifier.uuid}].`)).to.be.true;
      });

      it('propagates error if getMedicDocById throws an error', async () => {
        const err = new Error('error');
        getDocByIdInner.throws(err);

        await expect(Report.v1.get(localContext)(identifier)).to.be.rejectedWith('error');

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

      it('returns a report with contact lineage when found', async () => {
        const report = { type: 'data_record', form: 'yes', _id: 'report_id', contact: { _id: 'contact_id' } };
        const mockFunction = sinon.stub().resolves(report);
        mockFetchHydratedDoc.returns(mockFunction);

        const result = await Report.v1.getWithLineage(localContext)(identifier);

        expect(result).to.deep.equal(report);
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if document is not a report', async () => {
        const report = { type: 'not_a_report', _id: 'doc_id' };
        const mockFunction = sinon.stub().resolves(report);
        mockFetchHydratedDoc.returns(mockFunction);

        const result = await Report.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if document is not found', async () => {
        const mockFunction = sinon.stub().resolves(null);
        mockFetchHydratedDoc.returns(mockFunction);

        const result = await Report.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(mockFetchHydratedDoc.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(mockFunction.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });

    describe('getUuidsPage', () => {
      const limit = 3;
      const expectedResult = { cursor: 'bookmark', data: ['1', '2', '3'] };
      let queryViewFreetextByKey: SinonStub;
      let queryViewFreetextByRange: SinonStub;
      let fetchAndFilterIdsInner: SinonStub;
      let fetchAndFilterIdsOuter: SinonStub;
      let queryNouveauFreetext: SinonStub;
      let useNouveauIndexes: SinonStub;

      beforeEach(() => {
        queryViewFreetextByKey = sinon.stub();
        sinon
          .stub(LocalDoc, 'queryDocIdsByKey')
          .withArgs(localContext.medicDb, 'medic-offline-freetext/reports_by_freetext')
          .returns(queryViewFreetextByKey);

        queryViewFreetextByRange = sinon.stub();
        sinon
          .stub(LocalDoc, 'queryDocIdsByRange')
          .withArgs(localContext.medicDb, 'medic-offline-freetext/reports_by_freetext')
          .returns(queryViewFreetextByRange);

        fetchAndFilterIdsInner = sinon.stub();
        fetchAndFilterIdsOuter = sinon
          .stub(LocalDoc, 'fetchAndFilterIds')
          .returns(fetchAndFilterIdsInner);

        queryNouveauFreetext = sinon.stub();
        sinon
          .stub(Nouveau, 'queryByFreetext')
          .withArgs(localContext.medicDb, 'reports_by_freetext')
          .returns(queryNouveauFreetext);

        useNouveauIndexes = sinon.stub(Nouveau, 'useNouveauIndexes');
      });

      describe('when useNouveauIndexes is true', () => {
        beforeEach(() => {
          queryNouveauFreetext.resolves(expectedResult);
          useNouveauIndexes.resolves(true);
        });

        ([
          ['searching with a keyed value and no cursor', null, 'key:value'],
          ['searching with a keyed value and a cursor', 'cursor', 'key:value'],
          ['searching with a prefix qualifier and no cursor', null, 'searchterm'],
          ['searching with a prefix qualifier and no cursor', 'cursor', 'searchterm']
        ] as [string, string | null, string][]).forEach(([test, cursor, freetext]) => {
          it(`uses nouveau for freetext searches when ${test}`, async () => {
            const qualifier = Qualifier.byFreetext(freetext);

            const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

            expect(res).to.deep.equal(expectedResult);
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.calledOnceWithExactly(qualifier, cursor, limit)).to.be.true;
            expect(queryViewFreetextByKey.notCalled).to.be.true;
            expect(queryViewFreetextByRange.notCalled).to.be.true;
            expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
            expect(fetchAndFilterIdsInner.notCalled).to.be.true;
          });
        });

        it('normalizes freetext qualifier before querying nouveau', async () => {
          const freetext = '  HAS:DELIMITER  ';
          const qualifier = Qualifier.byFreetext(freetext);

          const res = await Report.v1.getUuidsPage(localContext)(qualifier, null, limit);

          expect(res).to.deep.equal(expectedResult);
          expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(queryNouveauFreetext.calledOnceWithExactly(
            Qualifier.byFreetext('has:delimiter'),
            null,
            limit
          )).to.be.true;
          expect(queryViewFreetextByKey.notCalled).to.be.true;
          expect(queryViewFreetextByRange.notCalled).to.be.true;
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
          it('uses offline views for freetext keyed qualifier', async () => {
            const freetext = 'key:value';
            const qualifier = Qualifier.byFreetext(freetext);

            const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

            expect(res).to.deep.equal(expectedResult);
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.notCalled).to.be.true;
            expect(queryViewFreetextByRange.notCalled).to.be.true;
            expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
            expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
            expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, skip)).to.be.true;

            // Verify the page function uses the keyed freetext view
            const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
            pageFn(limit, skip);

            expect(queryViewFreetextByKey.calledWithExactly([freetext], limit, skip)).to.be.true;
          });

          it('uses offline views for freetext prefix qualifier', async () => {
            const freetext = 'searchterm';
            const qualifier = Qualifier.byFreetext(freetext);

            const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

            expect(res).to.deep.equal(expectedResult);
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.notCalled).to.be.true;
            expect(queryViewFreetextByKey.notCalled).to.be.true;
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
        });

        it('normalizes freetext qualifier before querying', async () => {
          const freetext = '  HAS:DELIMITER  ';
          const qualifier = Qualifier.byFreetext(freetext);

          const res = await Report.v1.getUuidsPage(localContext)(qualifier, null, limit);

          expect(res).to.deep.equal(expectedResult);
          expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(queryNouveauFreetext.notCalled).to.be.true;
          expect(queryViewFreetextByRange.notCalled).to.be.true;
          expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
          expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
          expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, 0)).to.be.true;

          // Verify the page function uses the keyed freetext view
          const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
          pageFn(limit, 0);

          expect(queryViewFreetextByKey.calledWithExactly(['has:delimiter'], limit, 0)).to.be.true;
        });

        it(`throws an error if cursor is invalid`, async () => {
          const qualifier = Qualifier.byFreetext('nice:report');
          const cursor = 'not a number';

          await expect(Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit))
            .to.be.rejectedWith(
              InvalidArgumentError,
              `The cursor must be a string or null for first page: [${JSON.stringify(cursor)}]`
            );

          expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(queryNouveauFreetext.notCalled).to.be.true;
          expect(queryViewFreetextByKey.notCalled).to.be.true;
          expect(queryViewFreetextByRange.notCalled).to.be.true;
          expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
          expect(fetchAndFilterIdsInner.notCalled).to.be.true;
        });
      });
    });
  });
});
