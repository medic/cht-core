import * as LocalDataContext from '../../src/local/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { Doc } from '../../src/libs/doc';
import logger from '@medic/logger';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Report from '../../src/local/report';
import { expect } from 'chai';
import { END_OF_ALPHABET_MARKER } from '../../src/libs/constants';
import * as Lineage from '../../src/local/libs/lineage';
import { NotFoundError } from '../../src/libs/error';

describe('local report', () => {
  let localContext: LocalDataContext.LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: {getAll: settingsGetAll}
    } as unknown as LocalDataContext.LocalDataContext;
    warn = sinon.stub(logger, 'warn');
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    const settings = {hello: 'world'} as const;
    
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
      const cursor = null;
      const notNullCursor = '5';
      const reportType = 'data_record';
      let queryDocUuidsByKeyInner: SinonStub;
      let queryDocUuidsByKeyOuter: SinonStub;
      let queryDocUuidsByRangeInner: SinonStub;
      let queryDocUuidsByRangeOuter: SinonStub;
      let fetchAndFilterUuidsInner: SinonStub;
      let fetchAndFilterUuidsOuter: SinonStub;
      let isOffline: SinonStub;
      let queryNouveauIndexUuidsInner: SinonStub;
      let queryNouveauIndexUuidsOuter: SinonStub;
      
      beforeEach(() => {
        queryDocUuidsByKeyInner = sinon.stub();
        queryDocUuidsByKeyOuter = sinon.stub(LocalDoc, 'queryDocUuidsByKey').returns(queryDocUuidsByKeyInner);
        queryDocUuidsByRangeInner = sinon.stub();
        queryDocUuidsByRangeOuter = sinon.stub(LocalDoc, 'queryDocUuidsByRange').returns(queryDocUuidsByRangeInner);
        fetchAndFilterUuidsInner = sinon.stub();
        fetchAndFilterUuidsOuter = sinon.stub(LocalDoc, 'fetchAndFilterUuids').returns(fetchAndFilterUuidsInner);
        isOffline = sinon.stub(LocalDataContext, 'isOffline');
        queryNouveauIndexUuidsInner = sinon.stub();
        queryNouveauIndexUuidsOuter = sinon.stub(LocalDoc, 'queryNouveauIndexUuids')
          .returns(queryNouveauIndexUuidsInner);
      });

      it(
        'returns a page of report identifiers for freetext only qualifier with : delimiter for offline mode',
        async () => {
          const freetext = 'has:delimiter';
          const qualifier = {
            freetext
          };
          const docs = [
            { type: reportType, _id: '1', form: 'yes' },
            { type: reportType, _id: '2', form: 'yes' },
            { type: reportType, _id: '3', form: 'yes' }
          ];
          const getPaginatedDocsResult = {
            cursor: '3',
            data: docs.map(doc => doc._id)
          };
          const expectedResult = {
            cursor: '3',
            data: ['1', '2', '3']
          };
          isOffline.resolves(true);
          fetchAndFilterUuidsInner.resolves(getPaginatedDocsResult);

          const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
          const fetchAndFilterUuidsOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

          expect(res).to.deep.equal(expectedResult);
          expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByKeyOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
          expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByRangeOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
          expect(fetchAndFilterUuidsOuter.calledOnce).to.be.true;
          expect(fetchAndFilterUuidsOuter.firstCall.args[0]).to.be.a('function');
          expect(fetchAndFilterUuidsOuter.firstCall.args[1]).to.be.equal(limit);
          expect(fetchAndFilterUuidsInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
          // call the argument to check which one of the inner functions was called
          fetchAndFilterUuidsOuterFirstArg(limit, Number(cursor));
          expect(queryDocUuidsByKeyInner.calledWithExactly([qualifier.freetext], limit, Number(cursor))).to.be.true;
          expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
          expect(queryNouveauIndexUuidsInner.notCalled).to.be.true;
          expect(queryNouveauIndexUuidsOuter.notCalled).to.be.true;
        }
      );
      
      it(
        'returns a page of report identifiers for freetext only qualifier with : delimiter for online mode',
        async () => {
          const freetext = 'has:delimiter';
          const qualifier = {
            freetext
          };
          const docs = [
            { type: reportType, _id: '1', form: 'yes' },
            { type: reportType, _id: '2', form: 'yes' },
            { type: reportType, _id: '3', form: 'yes' }
          ];
          const getPaginatedDocsResult = {
            cursor: '3',
            data: docs.map(doc => doc._id)
          };
          const expectedResult = {
            cursor: '3',
            data: ['1', '2', '3']
          };
          isOffline.resolves(false);
          queryNouveauIndexUuidsInner.resolves(getPaginatedDocsResult);

          const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

          expect(res).to.deep.equal(expectedResult);
          expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByKeyOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
          expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByRangeOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
          expect(fetchAndFilterUuidsInner.notCalled).to.be.true;
          expect(fetchAndFilterUuidsOuter.notCalled).to.be.true;
          expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
          expect(queryNouveauIndexUuidsOuter.calledOnceWithExactly({}, 'reports_by_freetext')).to.be.true;
          expect(queryNouveauIndexUuidsInner.calledOnceWithExactly({
            key: [qualifier.freetext],
            limit,
            cursor
          })).to.be.true;
        }
      );

      it(
        'returns a page of report identifiers for freetext only qualifier without : delimiter for offline mode',
        async () => {
          const freetext = 'does not have colon delimiter';
          const qualifier = {
            freetext
          };
          const docs = [
            { type: reportType, _id: '1', form: 'yes' },
            { type: reportType, _id: '2', form: 'yes' },
            { type: reportType, _id: '3', form: 'yes' }
          ];
          const getPaginatedDocsResult = {
            cursor: '3',
            data: docs.map(doc => doc._id)
          };
          const expectedResult = {
            cursor: '3',
            data: ['1', '2', '3']
          };
          isOffline.resolves(true);
          fetchAndFilterUuidsInner.resolves(getPaginatedDocsResult);

          const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
          const fetchAndFilterOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

          expect(res).to.deep.equal(expectedResult);
          expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByKeyOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
          expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByRangeOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
          expect(fetchAndFilterUuidsOuter.calledOnce).to.be.true;
          expect(fetchAndFilterUuidsOuter.firstCall.args[0]).to.be.a('function');
          expect(fetchAndFilterUuidsOuter.firstCall.args[1]).to.be.equal(limit);
          expect(fetchAndFilterUuidsInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
          // call the argument to check which one of the inner functions was called
          fetchAndFilterOuterFirstArg(limit, Number(cursor));
          expect(queryDocUuidsByRangeInner.calledWithExactly(
            [qualifier.freetext],
            [qualifier.freetext + END_OF_ALPHABET_MARKER],
            limit,
            Number(cursor)
          )).to.be.true;
          expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
          expect(queryNouveauIndexUuidsInner.notCalled).to.be.true;
          expect(queryNouveauIndexUuidsOuter.notCalled).to.be.true;
        }
      );

      it(
        'returns a page of report identifiers for freetext only qualifier without : delimiter for online mode',
        async () => {
          const freetext = 'does not have colon delimiter';
          const qualifier = {
            freetext
          };
          const docs = [
            { type: reportType, _id: '1', form: 'yes' },
            { type: reportType, _id: '2', form: 'yes' },
            { type: reportType, _id: '3', form: 'yes' }
          ];
          const getPaginatedDocsResult = {
            cursor: '3',
            data: docs.map(doc => doc._id)
          };
          const expectedResult = {
            cursor: '3',
            data: ['1', '2', '3']
          };
          isOffline.resolves(false);
          queryNouveauIndexUuidsInner.resolves(getPaginatedDocsResult);

          const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

          expect(res).to.deep.equal(expectedResult);
          expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByKeyOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
          expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByRangeOuter.getCall(0).args
          ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
          expect(fetchAndFilterUuidsOuter.notCalled).to.be.true;
          expect(fetchAndFilterUuidsInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
          expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
          expect(queryNouveauIndexUuidsOuter.calledOnceWithExactly({}, 'reports_by_freetext')).to.be.true;
          expect(queryNouveauIndexUuidsInner.calledOnceWithExactly({
            startKey: [qualifier.freetext],
            limit,
            cursor
          })).to.be.true;
        }
      );

      it('returns a page of report identifiers for freetext only qualifier' +
        'with : delimiter for not-null cursor for offline mode', async () => {
        const freetext = 'has:delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: reportType, _id: '1', form: 'yes' },
          { type: reportType, _id: '2', form: 'yes' },
          { type: reportType, _id: '3', form: 'yes' }
        ];
        const getPaginatedDocsResult = {
          cursor: '8',
          data: docs.map(doc => doc._id)
        };
        const expectedResult = {
          cursor: '8',
          data: ['1', '2', '3']
        };
        isOffline.resolves(true);
        fetchAndFilterUuidsInner.resolves(getPaginatedDocsResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);
        const fetchAndFilterUuidsOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(fetchAndFilterUuidsOuter.calledOnce).to.be.true;
        expect(fetchAndFilterUuidsOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterUuidsOuter.firstCall.args[1]).to.be.equal(limit);
        expect(fetchAndFilterUuidsInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterUuidsOuterFirstArg(limit, Number(notNullCursor));
        expect(
          queryDocUuidsByKeyInner.calledWithExactly([qualifier.freetext], limit, Number(notNullCursor))
        ).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryNouveauIndexUuidsInner.notCalled).to.be.true;
        expect(queryNouveauIndexUuidsOuter.notCalled).to.be.true;
      });

      it('returns a page of report identifiers for freetext only qualifier' +
        'with : delimiter for not-null cursor for online mode', async () => {
        const freetext = 'has:delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: reportType, _id: '1', form: 'yes' },
          { type: reportType, _id: '2', form: 'yes' },
          { type: reportType, _id: '3', form: 'yes' }
        ];
        const getPaginatedDocsResult = {
          cursor: '8',
          data: docs.map(doc => doc._id)
        };
        const expectedResult = {
          cursor: '8',
          data: ['1', '2', '3']
        };
        isOffline.resolves(false);
        queryNouveauIndexUuidsInner.resolves(getPaginatedDocsResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(fetchAndFilterUuidsOuter.notCalled).to.be.true;
        expect(fetchAndFilterUuidsInner.notCalled).to.be.true;
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryNouveauIndexUuidsOuter.calledOnceWithExactly({}, 'reports_by_freetext')).to.be.true;
        expect(queryNouveauIndexUuidsInner.calledOnceWithExactly({
          key: [qualifier.freetext],
          limit,
          cursor: notNullCursor
        })).to.be.true;
      });

      it('returns a page of report identifiers for freetext only qualifier' +
        'without : delimiter for not-null cursor for offline mode', async () => {
        const freetext = 'does not have colon delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: reportType, _id: '1', form: 'yes' },
          { type: reportType, _id: '2', form: 'yes' },
          { type: reportType, _id: '3', form: 'yes' }
        ];
        const getPaginatedDocsResult = {
          cursor: '8',
          data: docs.map(doc => doc._id)
        };
        const expectedResult = {
          cursor: '8',
          data: ['1', '2', '3']
        };
        isOffline.resolves(true);
        fetchAndFilterUuidsInner.resolves(getPaginatedDocsResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);
        const fetchAndFilterUuidsOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(fetchAndFilterUuidsOuter.calledOnce).to.be.true;
        expect(fetchAndFilterUuidsOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterUuidsOuter.firstCall.args[1]).to.be.equal(limit);
        expect(fetchAndFilterUuidsInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterUuidsOuterFirstArg(limit, Number(notNullCursor));
        expect(queryDocUuidsByRangeInner.calledWithExactly(
          [qualifier.freetext],
          [qualifier.freetext + END_OF_ALPHABET_MARKER],
          limit,
          Number(notNullCursor)
        )).to.be.true;
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryNouveauIndexUuidsInner.notCalled).to.be.true;
        expect(queryNouveauIndexUuidsOuter.notCalled).to.be.true;
      });

      it('returns a page of report identifiers for freetext only qualifier' +
        'without : delimiter for not-null cursor for online mode', async () => {
        const freetext = 'does not have colon delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: reportType, _id: '1', form: 'yes' },
          { type: reportType, _id: '2', form: 'yes' },
          { type: reportType, _id: '3', form: 'yes' }
        ];
        const getPaginatedDocsResult = {
          cursor: '8',
          data: docs.map(doc => doc._id)
        };
        const expectedResult = {
          cursor: '8',
          data: ['1', '2', '3']
        };
        isOffline.resolves(false);
        queryNouveauIndexUuidsInner.resolves(getPaginatedDocsResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(fetchAndFilterUuidsOuter.notCalled).to.be.true;
        expect(fetchAndFilterUuidsInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryNouveauIndexUuidsOuter.calledOnceWithExactly({}, 'reports_by_freetext')).to.be.true;
        expect(queryNouveauIndexUuidsInner.calledOnceWithExactly({
          startKey: [qualifier.freetext],
          limit,
          cursor: notNullCursor
        })).to.be.true;
      });

      [
        {},
        '-1',
        undefined,
      ].forEach((invalidCursor ) => {
        it(`throws an error if cursor is invalid for offline mode: ${JSON.stringify(invalidCursor)}`, async () => {
          const freetext = 'nice report';
          const qualifier = {
            freetext,
          };
          isOffline.resolves(true);

          await expect(Report.v1.getUuidsPage(localContext)(qualifier, invalidCursor as string, limit))
            .to.be.rejectedWith(
              `The cursor must be a string or null for first page: [${JSON.stringify(invalidCursor)}]`
            );

          expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByKeyOuter.getCall(0).args
          ).to.deep.equal([ localContext.medicDb, 'medic-offline-freetext/reports_by_freetext' ]);
          expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByRangeOuter.getCall(0).args
          ).to.deep.equal([ localContext.medicDb, 'medic-offline-freetext/reports_by_freetext' ]);
          expect(fetchAndFilterUuidsOuter.notCalled).to.be.true;
          expect(queryNouveauIndexUuidsInner.notCalled).to.be.true;
          expect(queryNouveauIndexUuidsOuter.notCalled).to.be.true;
        });
      });

      it('returns empty array if reports do not exist for offline mode', async () => {
        const freetext = 'non-existent-report';
        const qualifier = {
          freetext
        };
        const expectedResult = {
          data: [],
          cursor
        };
        isOffline.resolves(true);
        fetchAndFilterUuidsInner.resolves(expectedResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterUuidsOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(fetchAndFilterUuidsOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterUuidsOuter.firstCall.args[1]).to.be.equal(limit);
        expect(fetchAndFilterUuidsInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterUuidsOuterFirstArg(limit, Number(cursor));
        expect(queryDocUuidsByRangeInner.calledWithExactly(
          [qualifier.freetext],
          [qualifier.freetext + END_OF_ALPHABET_MARKER],
          limit,
          Number(cursor)
        )).to.be.true;
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryNouveauIndexUuidsOuter.notCalled).to.be.true;
        expect(queryNouveauIndexUuidsInner.notCalled).to.be.true;
      });

      it('returns empty array if reports do not exist for online mode', async () => {
        const freetext = 'non-existent-report';
        const qualifier = {
          freetext
        };
        const expectedResult = {
          data: [],
          cursor
        };
        isOffline.resolves(false);
        queryNouveauIndexUuidsInner.resolves(expectedResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(fetchAndFilterUuidsOuter.notCalled).to.be.true;
        expect(fetchAndFilterUuidsInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
      });

      it('propagates error if any internally used function throws an error', async () => {
        const freetext = 'report';
        const qualifier = {
          freetext
        };
        const err = new Error('some error');
        isOffline.resolves(true);
        fetchAndFilterUuidsInner.throws(err);

        await expect(Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit)).to.be.rejectedWith(`some error`);
        const fetchAndFilterUuidsOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-offline-freetext/reports_by_freetext']);
        expect(fetchAndFilterUuidsOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterUuidsOuter.firstCall.args[1]).to.be.equal(limit);
        expect(fetchAndFilterUuidsInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterUuidsOuterFirstArg(limit, Number(cursor));
        expect(queryDocUuidsByRangeInner.calledWithExactly(
          [qualifier.freetext],
          [qualifier.freetext + END_OF_ALPHABET_MARKER],
          limit,
          Number(cursor)
        )).to.be.true;
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
      });
    });

    describe('create', () => {
      let createDocInner: SinonStub;
      let createDocOuter: SinonStub;
      let fetchHydratedDocInner: SinonStub;
      let fetchHydratedDocOuter: SinonStub;
      let queryDocUuidsByKeyInner: SinonStub;
      let queryDocUuidsByKeyOuter: SinonStub;

      beforeEach(() => {
        createDocInner = sinon.stub();
        createDocOuter = sinon.stub(LocalDoc, 'createDoc').returns(createDocInner);
        fetchHydratedDocInner = sinon.stub();
        fetchHydratedDocOuter = sinon.stub(Lineage, 'fetchHydratedDoc').returns(fetchHydratedDocInner);
        queryDocUuidsByKeyInner = sinon.stub().resolves(['form:test_form']);
        queryDocUuidsByKeyOuter = sinon.stub(LocalDoc, 'queryDocUuidsByKey').returns(queryDocUuidsByKeyInner);
        settingsGetAll.returns(settings);
      });

      it('creates a report with all required fields', async () => {
        const hydratedContact = { _id: 'contact-uuid' };
        const qualifier = {
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: hydratedContact
        };

        fetchHydratedDocInner.resolves(hydratedContact);
        createDocInner.resolves(createdDoc);

        const result = await Report.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(createDocInner.calledOnce).to.be.true;
        expect(fetchHydratedDocInner.calledWith('contact-uuid')).to.be.true;
      });

      it('throws error when form does not exist in database', async () => {
        queryDocUuidsByKeyInner.resolves(['form:other_form']);
        const qualifier = {
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };

        await expect(Report.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('Invalid form [test_form]. Form does not exist in database.');
      });

      it('throws error when _rev is provided for create', async () => {
        const qualifier = {
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid',
          _rev: '1-abc'
        };

        await expect(Report.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('_rev is not allowed for create operations.');
      });

      it('handles contact as hydrated object', async () => {
        const hydratedContact = { _id: 'contact-uuid', parent: { _id: 'parent-uuid' } };
        const qualifier = {
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: hydratedContact
        };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: hydratedContact
        };

        createDocInner.resolves(createdDoc);

        const result = await Report.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(fetchHydratedDocInner.notCalled).to.be.true;
      });

      it('throws error when contact is invalid type', async () => {
        const qualifier = {
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 12345 as unknown as string
        };

        await expect(Report.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('contact must be a string UUID or object, received number.');
      });

      it('throws error when contact UUID does not exist', async () => {
        fetchHydratedDocInner.resolves(null);
        const qualifier = {
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'invalid-uuid'
        };

        await expect(Report.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('Contact with UUID [invalid-uuid] not found.');
      });

      it('accepts reported_date as ISO string', async () => {
        const hydratedContact = { _id: 'contact-uuid' };
        const qualifier = {
          type: 'data_record',
          form: 'test_form',
          reported_date: '2025-01-15T10:30:00.000Z',
          contact: 'contact-uuid'
        };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: new Date('2025-01-15T10:30:00.000Z').getTime(),
          contact: hydratedContact
        };

        fetchHydratedDocInner.resolves(hydratedContact);
        createDocInner.resolves(createdDoc);

        const result = await Report.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0].reported_date).to.be.a('number');
      });

      it('converts ISO string with milliseconds to epoch milliseconds', async () => {
        const hydratedContact = { _id: 'contact-uuid' };
        const isoDate = '2025-01-15T10:30:00.123Z';
        const expectedEpoch = new Date(isoDate).getTime();
        const qualifier = {
          type: 'data_record',
          form: 'test_form',
          reported_date: isoDate,
          contact: 'contact-uuid'
        };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: expectedEpoch,
          contact: hydratedContact
        };

        fetchHydratedDocInner.resolves(hydratedContact);
        createDocInner.resolves(createdDoc);

        const result = await Report.v1.create(localContext)(qualifier);

        expect(result).to.deep.equal(createdDoc);
        expect(createDocInner.calledOnce).to.be.true;
        expect(createDocInner.firstCall.args[0]).to.have.property('reported_date', expectedEpoch);
      });

      it('throws error for invalid reported_date format', async () => {
        const qualifier = {
          type: 'data_record',
          form: 'test_form',
          reported_date: 'invalid-date',
          contact: 'contact-uuid'
        };

        await expect(Report.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('Invalid reported_date [invalid-date]. Must be a valid date string or timestamp.');
      });

      it('throws error when created document is not a valid report', async () => {
        const hydratedContact = { _id: 'contact-uuid' };
        const qualifier = {
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };
        const createdDoc = {
          _id: 'generated-uuid',
          _rev: '1-abc',
          type: 'not-data-record',
          contact: hydratedContact
        };

        fetchHydratedDocInner.resolves(hydratedContact);
        createDocInner.resolves(createdDoc);

        await expect(Report.v1.create(localContext)(qualifier))
          .to.be.rejectedWith('Created document [generated-uuid] is not a valid report.');
      });
    });

    describe('update', () => {
      let updateDocInner: SinonStub;
      let updateDocOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      let getDocByIdOuter: SinonStub;
      let fetchHydratedDocInner: SinonStub;
      let fetchHydratedDocOuter: SinonStub;
      let queryDocUuidsByKeyInner: SinonStub;
      let queryDocUuidsByKeyOuter: SinonStub;

      beforeEach(() => {
        updateDocInner = sinon.stub();
        updateDocOuter = sinon.stub(LocalDoc, 'updateDoc').returns(updateDocInner);
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
        fetchHydratedDocInner = sinon.stub();
        fetchHydratedDocOuter = sinon.stub(Lineage, 'fetchHydratedDoc').returns(fetchHydratedDocInner);
        queryDocUuidsByKeyInner = sinon.stub().resolves(['form:test_form']);
        queryDocUuidsByKeyOuter = sinon.stub(LocalDoc, 'queryDocUuidsByKey').returns(queryDocUuidsByKeyInner);
        settingsGetAll.returns(settings);
      });

      it('updates a report successfully', async () => {
        const hydratedContact = { _id: 'contact-uuid' };
        const existingDoc = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid',
          field: 'old_value'
        };
        const qualifier = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid',
          field: 'new_value'
        };
        const updatedDoc = { ...qualifier, _rev: '2-def', contact: hydratedContact };

        getDocByIdInner.resolves(existingDoc);
        fetchHydratedDocInner.resolves(hydratedContact);
        updateDocInner.resolves(updatedDoc);

        const result = await Report.v1.update(localContext)(qualifier);

        expect(result).to.deep.equal(updatedDoc);
        expect(getDocByIdInner.calledOnceWithExactly('report-uuid')).to.be.true;
        expect(updateDocInner.calledOnce).to.be.true;
      });

      it('throws error when _id is not provided', async () => {
        const qualifier = {
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };

        await expect(Report.v1.update(localContext)(qualifier as any))
          .to.be.rejectedWith('_id is required for update operations.');
      });

      it('throws error when _rev is not provided', async () => {
        const qualifier = {
          _id: 'report-uuid',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };

        await expect(Report.v1.update(localContext)(qualifier as any))
          .to.be.rejectedWith('_rev is required for update operations.');
      });

      it('throws NotFoundError when document does not exist', async () => {
        getDocByIdInner.resolves(null);
        const qualifier = {
          _id: 'non-existent-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };

        await expect(Report.v1.update(localContext)(qualifier))
          .to.be.rejectedWith(NotFoundError, 'Document [non-existent-uuid] not found.');
      });

      it('throws error when form does not exist in database', async () => {
        queryDocUuidsByKeyInner.resolves(['form:other_form']);
        const qualifier = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };

        await expect(Report.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('Invalid form [test_form]. Form does not exist in database.');
      });

      it('throws error when trying to change type', async () => {
        const existingDoc = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };
        const qualifier = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'different_type',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };

        getDocByIdInner.resolves(existingDoc);

        await expect(Report.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('Field [type] is immutable and cannot be changed.');
      });

      it('throws error when trying to change form', async () => {
        const existingDoc = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };
        const qualifier = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'different_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };

        getDocByIdInner.resolves(existingDoc);
        queryDocUuidsByKeyInner.resolves(['form:test_form', 'form:different_form']);

        await expect(Report.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('Field [form] is immutable and cannot be changed.');
      });

      it('throws error when trying to change reported_date', async () => {
        const existingDoc = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };
        const qualifier = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 67890,
          contact: 'contact-uuid'
        };

        getDocByIdInner.resolves(existingDoc);

        await expect(Report.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('Field [reported_date] is immutable and cannot be changed.');
      });

      it('throws error when trying to change contact UUID', async () => {
        const existingDoc = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };
        const qualifier = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'different-contact-uuid'
        };

        getDocByIdInner.resolves(existingDoc);

        await expect(Report.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('Field [contact] is immutable and cannot be changed.');
      });

      it('handles contact as hydrated object matching existing', async () => {
        const hydratedContact = { _id: 'contact-uuid', parent: { _id: 'parent-uuid' } };
        const existingDoc = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid',
          field: 'old_value'
        };
        const qualifier = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: hydratedContact,
          field: 'new_value'
        };
        const updatedDoc = { ...qualifier, _rev: '2-def' };

        getDocByIdInner.resolves(existingDoc);
        updateDocInner.resolves(updatedDoc);

        const result = await Report.v1.update(localContext)(qualifier);

        expect(result).to.deep.equal(updatedDoc);
        expect(fetchHydratedDocInner.notCalled).to.be.true;
      });

      it('throws error when contact is invalid type', async () => {
        const existingDoc = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };
        const qualifier = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 12345 as unknown as string
        };

        getDocByIdInner.resolves(existingDoc);

        await expect(Report.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('contact must be a string UUID or object, received number.');
      });

      it('throws error when updated document is not a valid report', async () => {
        const hydratedContact = { _id: 'contact-uuid' };
        const existingDoc = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };
        const qualifier = {
          _id: 'report-uuid',
          _rev: '1-abc',
          type: 'data_record',
          form: 'test_form',
          reported_date: 12345,
          contact: 'contact-uuid'
        };
        const updatedDoc = {
          _id: 'report-uuid',
          _rev: '2-def',
          type: 'not-data-record',
          contact: hydratedContact
        };

        getDocByIdInner.resolves(existingDoc);
        fetchHydratedDocInner.resolves(hydratedContact);
        updateDocInner.resolves(updatedDoc);

        await expect(Report.v1.update(localContext)(qualifier))
          .to.be.rejectedWith('Updated document [report-uuid] is not a valid report.');
      });
    });
  });
});
