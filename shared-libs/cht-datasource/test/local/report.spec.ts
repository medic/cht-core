import { LocalDataContext } from '../../src/local/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { Doc } from '../../src/libs/doc';
import logger from '@medic/logger';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Report from '../../src/local/report';
import { expect } from 'chai';
import { END_OF_ALPHABET_MARKER } from '../../src/libs/constants';

describe('local report', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: {getAll: settingsGetAll}
    } as unknown as LocalDataContext;
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

      beforeEach(() => {
        queryDocUuidsByKeyInner = sinon.stub();
        queryDocUuidsByKeyOuter = sinon.stub(LocalDoc, 'queryDocUuidsByKey').returns(queryDocUuidsByKeyInner);
        queryDocUuidsByRangeInner = sinon.stub();
        queryDocUuidsByRangeOuter = sinon.stub(LocalDoc, 'queryDocUuidsByRange').returns(queryDocUuidsByRangeInner);
        fetchAndFilterUuidsInner = sinon.stub();
        fetchAndFilterUuidsOuter = sinon.stub(LocalDoc, 'fetchAndFilterUuids').returns(fetchAndFilterUuidsInner);
      });

      it('returns a page of report identifiers for freetext only qualifier with : delimiter', async () => {
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
        fetchAndFilterUuidsInner.resolves(getPaginatedDocsResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterUuidsOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(fetchAndFilterUuidsOuter.calledOnce).to.be.true;
        expect(fetchAndFilterUuidsOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterUuidsOuter.firstCall.args[1]).to.be.equal(limit);
        expect(fetchAndFilterUuidsInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
        // call the argument to check which one of the inner functions was called
        fetchAndFilterUuidsOuterFirstArg(limit, Number(cursor));
        expect(queryDocUuidsByKeyInner.calledWithExactly([qualifier.freetext], limit, Number(cursor))).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
      });

      it('returns a page of report identifiers for freetext only qualifier without : delimiter', async () => {
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
        fetchAndFilterUuidsInner.resolves(getPaginatedDocsResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
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
      });

      it('returns a page of report identifiers for freetext only qualifier' +
        'with : delimiter for not-null cursor', async () => {
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
        fetchAndFilterUuidsInner.resolves(getPaginatedDocsResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);
        const fetchAndFilterUuidsOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
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
      });

      it('returns a page of report identifiers for freetext only qualifier' +
        'without : delimiter for not-null cursor', async () => {
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
        fetchAndFilterUuidsInner.resolves(getPaginatedDocsResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, notNullCursor, limit);
        const fetchAndFilterUuidsOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
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
      });

      [
        {},
        '-1',
        undefined,
      ].forEach((invalidCursor ) => {
        it(`throws an error if cursor is invalid: ${String(invalidCursor)}`, async () => {
          const freetext = 'nice report';
          const qualifier = {
            freetext,
          };

          await expect(Report.v1.getUuidsPage(localContext)(qualifier, invalidCursor as string, limit))
            .to.be.rejectedWith(
              `The cursor must be a string or null for first page: [${JSON.stringify(invalidCursor)}]`
            );

          expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByKeyOuter.getCall(0).args
          ).to.deep.equal([ localContext.medicDb, 'medic-client/reports_by_freetext' ]);
          expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
          expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
          expect(
            queryDocUuidsByRangeOuter.getCall(0).args
          ).to.deep.equal([ localContext.medicDb, 'medic-client/reports_by_freetext' ]);
          expect(fetchAndFilterUuidsOuter.notCalled).to.be.true;
        });
      });

      it('returns empty array if reports do not exist', async () => {
        const freetext = 'non-existent-report';
        const qualifier = {
          freetext
        };
        const expectedResult = {
          data: [],
          cursor
        };
        fetchAndFilterUuidsInner.resolves(expectedResult);

        const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterUuidsOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
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

      it('propagates error if any internally used function throws an error', async () => {
        const freetext = 'report';
        const qualifier = {
          freetext
        };
        const err = new Error('some error');
        fetchAndFilterUuidsInner.throws(err);

        await expect(Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit)).to.be.rejectedWith(`some error`);
        const fetchAndFilterUuidsOuterFirstArg =
          fetchAndFilterUuidsOuter.firstCall.args[0] as (...args: unknown[]) => unknown;

        expect(queryDocUuidsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocUuidsByKeyInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeInner.notCalled).to.be.true;
        expect(queryDocUuidsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocUuidsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
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
  });
});
