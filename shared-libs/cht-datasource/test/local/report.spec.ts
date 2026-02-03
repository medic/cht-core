import * as LocalDataContext from '../../src/local/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Report from '../../src/local/report';
import { expect } from 'chai';
import { END_OF_ALPHABET_MARKER } from '../../src/libs/constants';
import * as Lineage from '../../src/local/libs/lineage';
import * as LocalCore from '../../src/local/libs/core';
import * as LocalContact from '../../src/local/contact';
import { InvalidArgumentError, ResourceNotFoundError } from '../../src';

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
        const doc = { type: 'data_record', form: 'yes', _id: 'uuid', _rev: '1' };
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
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid report.`)).to.be.true;
      });

      it('returns null if the identified doc does not have a form field', async () => {
        const doc = { type: 'data_record', _id: '_id' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);

        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid report.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid report.`)).to.be.true;
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
      let fetchHydratedDocOuter: SinonStub;
      let fetchHydratedDocInner: SinonStub;

      beforeEach(() => {
        fetchHydratedDocInner = sinon.stub();
        fetchHydratedDocOuter = sinon.stub(Lineage, 'fetchHydratedDoc').returns(fetchHydratedDocInner);
      });

      it('returns a report with contact lineage when found', async () => {
        const report = {
          type: 'data_record',
          form: 'yes',
          _id: 'report_id',
          _rev: '1',
          contact: { _id: 'contact_id' }
        };
        fetchHydratedDocInner.resolves(report);

        const result = await Report.v1.getWithLineage(localContext)(identifier);

        expect(result).to.deep.equal(report);
        expect(fetchHydratedDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(fetchHydratedDocInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if document is not a report', async () => {
        const report = { type: 'not_a_report', _id: 'doc_id' };
        fetchHydratedDocInner.resolves(report);

        const result = await Report.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(fetchHydratedDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(fetchHydratedDocInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if document is not found', async () => {
        fetchHydratedDocInner.resolves(null);

        const result = await Report.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(fetchHydratedDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(fetchHydratedDocInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
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
      const contact = {
        _id: 'contact-1',
        _rev: '1',
        type: 'person',
        parent: { _id: 'parent-1' }
      } as const;
      const reportDoc = { _id: 'report-1', type: 'data_record', form: 'test-form' } as const;
      const supportedForms = ['test-form', 'other-form'];
      const reportedDate = new Date().getTime();

      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      let createDocOuter: SinonStub;
      let createDocInner: SinonStub;
      let getDocUuidsByIdRangeOuter: SinonStub;
      let getDocUuidsByIdRangeInner: SinonStub;
      let minifyDocOuter: SinonStub;
      let minifyDocInner: SinonStub;
      let isContact: SinonStub;
      let getReportedDateTimestamp: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub().resolves(contact);
        getDocByIdOuter = sinon
          .stub(LocalDoc, 'getDocById')
          .returns(getDocByIdInner);
        createDocInner = sinon.stub().resolves(reportDoc);
        createDocOuter = sinon
          .stub(LocalDoc, 'createDoc')
          .returns(createDocInner);
        getDocUuidsByIdRangeInner = sinon.stub().resolves(supportedForms.map(f => `form:${f}`));
        getDocUuidsByIdRangeOuter = sinon
          .stub(LocalDoc, 'getDocUuidsByIdRange')
          .returns(getDocUuidsByIdRangeInner);
        minifyDocInner = sinon.stub().returnsArg(0);
        minifyDocOuter = sinon
          .stub(Lineage, 'minifyDoc')
          .returns(minifyDocInner);
        isContact = sinon
          .stub(LocalContact.v1, 'isContact')
          .returns(true);
        getReportedDateTimestamp = sinon
          .stub(LocalCore, 'getReportedDateTimestamp')
          .returns(reportedDate);
        settingsGetAll.returns(settings);
      });

      it('creates a report with valid input', async () => {
        const input = {
          form: 'test-form',
          contact: contact._id,
        };

        const result = await Report.v1.create(localContext)(input);

        expect(result).to.equal(reportDoc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(minifyDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(input.contact)).to.be.true;
        expect(getDocUuidsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
        expect(isContact.calledOnceWithExactly(localContext.settings, contact)).to.be.true;
        expect(getReportedDateTimestamp.calledOnceWithExactly(undefined)).to.be.true;
        const expectedReport = {
          ...input,
          contact,
          reported_date: reportedDate,
          type: 'data_record'
        };
        expect(minifyDocInner.calledOnceWithExactly(expectedReport)).to.be.true;
        expect(createDocInner.calledOnceWithExactly(expectedReport)).to.be.true;
      });

      it('creates a report with reported_date in input', async () => {
        const input = {
          form: 'test-form',
          contact: contact._id,
          reported_date: 123456789
        };

        const result = await Report.v1.create(localContext)(input);

        expect(result).to.equal(reportDoc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(minifyDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(input.contact)).to.be.true;
        expect(getDocUuidsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
        expect(isContact.calledOnceWithExactly(localContext.settings, contact)).to.be.true;
        expect(getReportedDateTimestamp.calledOnceWithExactly(input.reported_date)).to.be.true;
        const expectedReport = {
          ...input,
          contact,
          reported_date: reportedDate,
          type: 'data_record'
        };
        expect(minifyDocInner.calledOnceWithExactly(expectedReport)).to.be.true;
        expect(createDocInner.calledOnceWithExactly(expectedReport)).to.be.true;
      });

      it('throws error if input validation fails', async () => {
        const input = {
          form: 'test-form',
          contact: contact._id,
          _rev: '1-rev'
        };

        await expect(Report.v1.create(localContext)(input as unknown as never))
          .to.be.rejectedWith(InvalidArgumentError, 'The [_rev] field must not be set.');

        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(minifyDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.notCalled).to.be.true;
        expect(getDocUuidsByIdRangeInner.notCalled).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(minifyDocInner.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws error if form is not supported', async () => {
        const input = {
          form: 'unsupported-form',
          contact: contact._id,
        };

        await expect(Report.v1.create(localContext)(input))
          .to.be.rejectedWith(`Invalid form value [${input.form}].`);

        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(minifyDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(input.contact)).to.be.true;
        expect(getDocUuidsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(minifyDocInner.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      [
        null,
        { _id: 'non-existent-contact', type: 'data_record' }
      ].forEach(invalidContact => {
        it('throws error if contact is not found', async () => {
          const input = {
            form: 'test-form',
            contact: 'non-existent-contact',
          };
          getDocByIdInner.resolves(invalidContact);
          isContact.returns(false);

          await expect(Report.v1.create(localContext)(input))
            .to.be.rejectedWith(`Contact [${input.contact}] not found.`);

          expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(minifyDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getDocByIdInner.calledOnceWithExactly(input.contact)).to.be.true;
          expect(getDocUuidsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
          expect(isContact.calledOnceWithExactly(localContext.settings, invalidContact)).to.be.true;
          expect(getReportedDateTimestamp.notCalled).to.be.true;
          expect(minifyDocInner.notCalled).to.be.true;
          expect(createDocInner.notCalled).to.be.true;
        });
      });
    });

    describe('update', () => {
      const originalReport = {
        _id: 'report-1',
        _rev: '1-rev',
        type: 'data_record',
        form: 'test-form',
        reported_date: 12312312,
        contact: {
          _id: 'contact-1',
          parent: {
            _id: 'parent-1'
          }
        },
        fields: { hello: 'world' }
      } as const;
      const contactDoc = { _id: 'contact-1', type: 'person' } as const;
      const supportedForms = ['test-form', 'other-form', 'new-form'];

      let getDocsByIdsOuter: SinonStub;
      let getDocsByIdsInner: SinonStub;
      let updateDocOuter: SinonStub;
      let updateDocInner: SinonStub;
      let getDocUuidsByIdRangeOuter: SinonStub;
      let getDocUuidsByIdRangeInner: SinonStub;
      let getUpdatedContactOuter: SinonStub;
      let getUpdatedContactInner: SinonStub;

      beforeEach(() => {
        getDocsByIdsInner = sinon
          .stub()
          .resolves([originalReport, contactDoc]);
        getDocsByIdsOuter = sinon
          .stub(LocalDoc, 'getDocsByIds')
          .returns(getDocsByIdsInner);
        updateDocInner = sinon.stub();
        updateDocOuter = sinon
          .stub(LocalDoc, 'updateDoc')
          .returns(updateDocInner);
        getDocUuidsByIdRangeInner = sinon
          .stub()
          .resolves(supportedForms.map(f => `form:${f}`));
        getDocUuidsByIdRangeOuter = sinon
          .stub(LocalDoc, 'getDocUuidsByIdRange')
          .returns(getDocUuidsByIdRangeInner);
        getUpdatedContactInner = sinon.stub();
        getUpdatedContactOuter = sinon
          .stub(Lineage, 'getUpdatedContact')
          .returns(getUpdatedContactInner);
        settingsGetAll.returns(settings);
      });

      it('updates doc for valid update input', async () => {
        const updateInput = {
          ...originalReport,
          fields: { hello: 'updated' }
        };
        getUpdatedContactInner.returns(updateInput.contact);
        updateDocInner.resolves({ _rev: '2-rev' });

        const result = await Report.v1.update(localContext)(updateInput);

        expect(result).to.deep.equal({ ...updateInput, _rev: '2-rev' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, 'contact-1'])).to.be.true;
        expect(getDocUuidsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, contactDoc)).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateInput)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
      });

      [
        { ...originalReport, _id: undefined },
        { ...originalReport, _rev: undefined },
        { ...originalReport, type: 'not-data-record' },
        { ...originalReport, form: undefined },
      ].forEach((updateInput) => {
        it(`throws error if input is not a valid report`, async () => {
          await expect(Report.v1.update(localContext)(updateInput as never))
            .to.be.rejectedWith(InvalidArgumentError, 'Valid _id, _rev, form, and type fields must be provided.');

          expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
          expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getDocsByIdsInner.notCalled).to.be.true;
          expect(getDocUuidsByIdRangeInner.notCalled).to.be.true;
          expect(getUpdatedContactInner.notCalled).to.be.true;
          expect(updateDocInner.notCalled).to.be.true;
          expect(settingsGetAll.notCalled).to.be.true;
        });
      });

      it('throws error when original report is not found', async () => {
        getDocsByIdsInner.resolves([null, contactDoc]);

        await expect(Report.v1.update(localContext)(originalReport))
          .to.be.rejectedWith(ResourceNotFoundError, `Report record [${originalReport._id}] not found.`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([originalReport._id, 'contact-1'])).to.be.true;
        expect(getDocUuidsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.notCalled).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
      });

      it('throws error when trying to remove contact value', async () => {
        const updateInput = { ...originalReport, contact: undefined };
        getDocsByIdsInner.resolves([originalReport, null]);
        getUpdatedContactInner.returns(null);

        await expect(Report.v1.update(localContext)(updateInput))
          .to.be.rejectedWith(InvalidArgumentError, 'A contact is must be provided.');

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, undefined])).to.be.true;
        expect(getDocUuidsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, null)).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
      });

      it('allows update when original report has no contact', async () => {
        const originalReportNoContact = {
          ...originalReport,
          contact: undefined
        };
        const updateInput = {
          ...originalReportNoContact,
          fields: { hello: 'updated' }
        };
        getDocsByIdsInner.resolves([originalReportNoContact, undefined]);
        getUpdatedContactInner.returns(undefined);
        updateDocInner.resolves({ _rev: '2-rev' });

        const result = await Report.v1.update(localContext)(updateInput);

        expect(result).to.deep.equal({ ...updateInput, contact: undefined, _rev: '2-rev' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, undefined])).to.be.true;
        expect(getDocUuidsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(
          originalReportNoContact,
          updateInput,
          undefined
        )).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateInput)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
      });

      it('allows setting contact when original report has no contact', async () => {
        const originalReportNoContact = {
          ...originalReport,
          contact: undefined
        };
        const updateInput = {
          ...originalReport,
          fields: { hello: 'updated' }
        };
        getDocsByIdsInner.resolves([originalReportNoContact, contactDoc]);
        getUpdatedContactInner.returns(updateInput.contact);
        updateDocInner.resolves({ _rev: '2-rev' });

        const result = await Report.v1.update(localContext)(updateInput);

        expect(result).to.deep.equal({ ...updateInput, _rev: '2-rev' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, contactDoc._id])).to.be.true;
        expect(getDocUuidsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(
          originalReportNoContact,
          updateInput,
          contactDoc
        )).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateInput)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
      });

      ([
        ['_rev', { ...originalReport, _rev: 'updated' }],
        ['reported_date', { ...originalReport, reported_date: 999999999 }],
      ] as unknown as [string, typeof originalReport][]).forEach(([field, updateInput]) => {
        it(`throws error when changing immutable field [${field}]`, async () => {
          getUpdatedContactInner.returns(updateInput.contact);

          await expect(Report.v1.update(localContext)(updateInput))
            .to.be.rejectedWith(InvalidArgumentError, `The [${field}] field must not be changed.`);

          expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
          expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, 'contact-1'])).to.be.true;
          expect(getDocUuidsByIdRangeInner.notCalled).to.be.true;
          expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, contactDoc)).to.be.true;
          expect(updateDocInner.notCalled).to.be.true;
          expect(settingsGetAll.notCalled).to.be.true;
        });
      });

      it('allows changing form to another valid form', async () => {
        const updateInput = {
          ...originalReport,
          form: 'new-form'
        };
        getUpdatedContactInner.returns(updateInput.contact);
        updateDocInner.resolves({ _rev: '2-rev' });

        const result = await Report.v1.update(localContext)(updateInput);

        expect(result).to.deep.equal({ ...updateInput, _rev: '2-rev' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, 'contact-1'])).to.be.true;
        expect(getDocUuidsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, contactDoc)).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateInput)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
      });

      it('throws error when changing form to an invalid form', async () => {
        const updateInput = {
          ...originalReport,
          form: 'invalid-form'
        };
        getUpdatedContactInner.returns(updateInput.contact);

        await expect(Report.v1.update(localContext)(updateInput))
          .to.be.rejectedWith(InvalidArgumentError, `Invalid form value [${updateInput.form}].`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, 'contact-1'])).to.be.true;
        expect(getDocUuidsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, contactDoc)).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
      });

      it('updates report when contact lineage data included', async () => {
        const updateInput = {
          ...originalReport,
          contact: {
            _id: 'contact-1',
            name: 'Contact Name',
            parent: {
              _id: 'parent-1',
              name: 'Parent Name'
            }
          },
          fields: { hello: 'updated' }
        };
        getUpdatedContactInner.returns(updateInput.contact);
        updateDocInner.resolves({ _rev: '2-rev' });

        const result = await Report.v1.update(localContext)(updateInput);

        // Full lineage data returned
        expect(result).to.deep.equal({ ...updateInput, _rev: '2-rev' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocUuidsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, 'contact-1'])).to.be.true;
        expect(getDocUuidsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, contactDoc)).to.be.true;
        // Minified lineage set on updated doc
        expect(updateDocInner.calledOnceWithExactly({ ...updateInput, contact: originalReport.contact })).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
      });
    });
  });
});
