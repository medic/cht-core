import { LocalDataContext } from '../../src/local/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { Doc } from '../../src/libs/doc';
import logger from '@medic/logger';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Report from '../../src/local/report';
import { expect } from 'chai';
import * as Contact from '../../src/local/contact';
import { getContactTypes } from '@medic/contact-types-utils';

describe('local report', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let debug: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: {getAll: settingsGetAll}
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    debug = sinon.stub(logger, 'debug');
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

        // eslint-disable-next-line compat/compat
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

        // eslint-disable-next-line compat/compat
        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${doc._id}] is not a valid report.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        // eslint-disable-next-line compat/compat
        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(warn.calledOnceWithExactly(`No report found for identifier [${identifier.uuid}].`)).to.be.true;
      });
    });

    describe('getPage', () => {
      const limit = 3;
      const cursor = null;
      const notNullCursor = '5';
      const reportType = 'data_record';
      const invalidReportTypeQualifier = { type: 'invalid_dat_record' } as const;
      let queryDocsByKeyInner: SinonStub;
      let queryDocsByKeyOuter: SinonStub;
      let queryDocsByRangeInner: SinonStub;
      let queryDocsByRangeOuter: SinonStub;
      let fetchAndFilterInner: SinonStub;
      let fetchAndFilterOuter: SinonStub;

      beforeEach(() => {
        queryDocsByKeyInner = sinon.stub();
        queryDocsByKeyOuter = sinon.stub(LocalDoc, 'queryDocsByKey').returns(queryDocsByKeyInner);
        queryDocsByRangeInner = sinon.stub();
        queryDocsByRangeOuter = sinon.stub(LocalDoc, 'queryDocsByRange').returns(queryDocsByRangeInner);
        fetchAndFilterInner = sinon.stub();
        fetchAndFilterOuter = sinon.stub(LocalDoc, 'fetchAndFilter').returns(fetchAndFilterInner);
      });

      it('returns a page of reports for freetext only qualifier with : delimiter', async () => {
        const freetext = 'has : delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: reportType, _id: '1', form: 'yes' },
          { type: reportType, _id: '2', form: 'yes' },
          { type: reportType, _id: '3', form: 'yes' }
        ];
        const fetchAndFilterResult = {
          cursor: '3',
          data: docs
        };
        const expectedResult = {
          cursor: '3',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        // eslint-disable-next-line compat/compat
        const res = await Report.v1.getPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;
        const fetchAndFilterOuterString = fetchAndFilterOuterFirstArg.toString();

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(queryDocsByRangeInner.notCalled).to.be.true;
        expect(queryDocsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuterString.includes('getReportsByFreetext(')).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
      });

      it('returns a page of reports for freetext only qualifier without : delimiter', async () => {
        const freetext = 'does not have colon delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: reportType, _id: '1', form: 'yes' },
          { type: reportType, _id: '2', form: 'yes' },
          { type: reportType, _id: '3', form: 'yes' }
        ];
        const fetchAndFilterResult = {
          cursor: '3',
          data: docs
        };
        const expectedResult = {
          cursor: '3',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        // eslint-disable-next-line compat/compat
        const res = await Report.v1.getPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;
        const fetchAndFilterOuterString = fetchAndFilterOuterFirstArg.toString();

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(queryDocsByRangeInner.notCalled).to.be.true;
        expect(queryDocsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuterString.includes('getReportsByFreetextRange(')).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
      });

      it('returns a page of reports for freetext only qualifier with : delimiter for not-null cursor', async () => {
        const freetext = 'has : delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: reportType, _id: '1', form: 'yes' },
          { type: reportType, _id: '2', form: 'yes' },
          { type: reportType, _id: '3', form: 'yes' }
        ];
        const fetchAndFilterResult = {
          cursor: '8',
          data: docs
        };
        const expectedResult = {
          cursor: '8',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        // eslint-disable-next-line compat/compat
        const res = await Report.v1.getPage(localContext)(qualifier, notNullCursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;
        const fetchAndFilterOuterString = fetchAndFilterOuterFirstArg.toString();

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(queryDocsByRangeInner.notCalled).to.be.true;
        expect(queryDocsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuterString.includes('getReportsByFreetext(')).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
      });

      it('returns a page of reports for freetext only qualifier without : delimiter for not-null cursor', async () => {
        const freetext = 'does not have colon delimiter';
        const qualifier = {
          freetext
        };
        const docs = [
          { type: reportType, _id: '1', form: 'yes' },
          { type: reportType, _id: '2', form: 'yes' },
          { type: reportType, _id: '3', form: 'yes' }
        ];
        const fetchAndFilterResult = {
          cursor: '8',
          data: docs
        };
        const expectedResult = {
          cursor: '8',
          data: ['1', '2', '3']
        };
        fetchAndFilterInner.resolves(fetchAndFilterResult);

        // eslint-disable-next-line compat/compat
        const res = await Report.v1.getPage(localContext)(qualifier, notNullCursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;
        const fetchAndFilterOuterString = fetchAndFilterOuterFirstArg.toString();

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(queryDocsByRangeInner.notCalled).to.be.true;
        expect(queryDocsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(fetchAndFilterOuter.calledOnce).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuterString.includes('getReportsByFreetextRange(')).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(notNullCursor))).to.be.true;
      });

      [
        {},
        '-1',
        undefined,
      ].forEach((invalidSkip ) => {
        it(`throws an error if cursor is invalid: ${String(invalidSkip)}`, async () => {
          const freetext = 'nice report';
          const qualifier = {
            freetext,
          };

          // eslint-disable-next-line compat/compat
          await expect(Report.v1.getPage(localContext)(qualifier, invalidSkip as string, limit))
            .to.be.rejectedWith(`Invalid cursor token: [${String(invalidSkip)}]`);

          expect(queryDocsByKeyOuter.callCount).to.be.equal(1);
          expect(
            queryDocsByKeyOuter.getCall(0).args
          ).to.deep.equal([ localContext.medicDb, 'medic-client/reports_by_freetext' ]);
          expect(queryDocsByKeyInner.notCalled).to.be.true;
          expect(queryDocsByRangeInner.notCalled).to.be.true;
          expect(queryDocsByRangeOuter.callCount).to.be.equal(1);
          expect(
            queryDocsByRangeOuter.getCall(0).args
          ).to.deep.equal([ localContext.medicDb, 'medic-client/reports_by_freetext' ]);
          expect(fetchAndFilterInner.notCalled).to.be.true;
          expect(fetchAndFilterOuter.notCalled).to.be.true;
        });
      });

      it('returns empty array if reports do not exist', async () => {
        const freetext = 'non-existent report';
        const qualifier = {
          freetext
        };
        const expectedResult = {
          data: [],
          cursor
        };
        fetchAndFilterInner.resolves(expectedResult);

        // eslint-disable-next-line compat/compat
        const res = await Report.v1.getPage(localContext)(qualifier, cursor, limit);
        const fetchAndFilterOuterFirstArg = fetchAndFilterOuter.firstCall.args[0] as (...args: unknown[]) => unknown;
        const fetchAndFilterOuterString = fetchAndFilterOuterFirstArg.toString();

        expect(res).to.deep.equal(expectedResult);
        expect(queryDocsByKeyOuter.callCount).to.be.equal(1);
        expect(
          queryDocsByKeyOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(queryDocsByKeyInner.notCalled).to.be.true;
        expect(queryDocsByRangeInner.notCalled).to.be.true;
        expect(queryDocsByRangeOuter.callCount).to.be.equal(1);
        expect(
          queryDocsByRangeOuter.getCall(0).args
        ).to.deep.equal([localContext.medicDb, 'medic-client/reports_by_freetext']);
        expect(fetchAndFilterOuter.firstCall.args[0]).to.be.a('function');
        expect(fetchAndFilterOuterString.includes('getReportsByFreetextRange(')).to.be.true;
        expect(fetchAndFilterOuter.firstCall.args[1]).to.be.a('function');
        expect(fetchAndFilterOuter.firstCall.args[2]).to.be.equal(limit);
        expect(fetchAndFilterInner.calledOnceWithExactly(limit, Number(cursor))).to.be.true;
      });
    });
  });
});
