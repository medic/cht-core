import { LocalDataContext } from '../../src/local/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Report from '../../src/local/report';
import { expect } from 'chai';
import { END_OF_ALPHABET_MARKER } from '../../src/libs/constants';
import * as Lineage from '../../src/local/libs/lineage';

describe('local report', () => {
  let localContext: LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;
  let createDocOuter: SinonStub;
  let createDocInner : SinonStub;
  let updateDocOuter: SinonStub;
  let updateDocInner : SinonStub;
  let getDocByIdOuter : SinonStub;
  let getDocByIdInner : SinonStub;
  beforeEach(() => {
    createDocInner = sinon.stub();
    updateDocInner = sinon.stub();
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: {getAll: settingsGetAll}
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
    createDocOuter = sinon.stub(LocalDoc, 'createDoc');
    updateDocOuter = sinon.stub(LocalDoc, 'updateDoc').returns(updateDocInner);
    getDocByIdInner = sinon.stub();
    getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    const settings = {hello: 'world'} as const;
    
    describe('get', () => {
      const identifier = { uuid: 'uuid' } as const;

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
        it(`throws an error if cursor is invalid: ${JSON.stringify(invalidCursor)}`, async () => {
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

    describe('createReport', () => {
      let queryDocUuidsByKeyInner :SinonStub;
      let queryDocUuidsByKeyOuter :SinonStub;

      beforeEach(() => {
        queryDocUuidsByKeyInner = sinon.stub();
        queryDocUuidsByKeyOuter = sinon.stub(LocalDoc, 'queryDocUuidsByKey');
        queryDocUuidsByKeyOuter.returns(queryDocUuidsByKeyInner);
      });
      it('creates a report doc for valid report qualifier', async () => {
        const input = {
          type: 'data_record',
          form: 'pregnancy_danger_sign',
          contact: 'c1',
          reported_date: new Date().toISOString()
        };
        const returnedContactDoc = {
          _id: 'c1',
          type: 'contact',
          contact_type: 'person',
          parent: {
            _id: 'c2'
          }
        };
        queryDocUuidsByKeyInner.resolves(['form:pregnancy_danger_sign']);
        getDocByIdInner.resolves(returnedContactDoc);
        const updatedInput = {
          ...input, contact: {
            _id: input.contact, parent: returnedContactDoc.parent
          }
        };
        const expected_report = {...updatedInput, _id: '1-id', _rev: '1-rev'}; 
        createDocOuter.returns(createDocInner);
        createDocInner.resolves(expected_report);
      
        const report = await Report.v1.create(localContext)(input);
        expect(report).to.deep.equal(expected_report);
        expect(createDocOuter.calledOnce).to.be.true;
        expect(createDocInner.calledOnceWithExactly(updatedInput)).to.be.true;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('throws error when contact with id does not exist in the db', async () => {
        const input = {
          type: 'data_record',
          form: 'pregnancy_danger_sign',
          contact: 'c1',
          reported_date: new Date().toISOString()
        };
        queryDocUuidsByKeyInner.resolves(['form:pregnancy_danger_sign']);
        getDocByIdInner.resolves(null);
        
        expect(createDocOuter.calledOnce).to.be.false;
      
        await expect(Report.v1.create(localContext)(input))
          .to.be.rejectedWith(`Contact with _id ${input.contact} does not exist.`);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('throws error for invalid `form` value', async () => {
        queryDocUuidsByKeyInner.resolves(['form:undo_death_report']);
        const input = {
          type: 'data_record',
          form: 'dummy_form_value',
          contact: 'c1',
          reported_date: new Date().toISOString()
        };
        
        await expect(Report.v1.create(localContext)(input))
          .to.be.rejectedWith('Invalid `form` value');
        expect(getDocByIdInner.called).to.be.false;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      });

      it('throws error when _rev is passed in report input', async () => {
        
        const input = {
          type: 'data_record',
          form: 'pregnancy_danger_sign',
          _rev: '1-rev',
          contact: 'c1'
        };

        await expect(Report.v1.create(localContext)(input))
          .to.be.rejectedWith('Cannot pass `_rev` when creating a report.');
        expect(createDocInner.called).to.be.false;
        expect(createDocOuter.called).to.be.true;
      });
    });
  });

  describe('updateReport', () => {
    let queryDocUuidsByKeyInner :SinonStub;
    let queryDocUuidsByKeyOuter :SinonStub;

    beforeEach(() => {
      queryDocUuidsByKeyInner = sinon.stub();
      queryDocUuidsByKeyOuter = sinon.stub(LocalDoc, 'queryDocUuidsByKey');
      queryDocUuidsByKeyOuter.returns(queryDocUuidsByKeyInner);
    });
    it('throws error when the update payload does not contain _id or _rev', async () => {
      const reportInput = {
        form: 'pregnancy_danger_sign',
        type: 'data_record',
        reported_date: 12312312
      };
      await expect(Report.v1.update(localContext)(reportInput))
        .to.be.rejectedWith(`Document for update is not a valid Doc ${JSON.stringify(reportInput)}`);
      expect(getDocByIdInner.called).to.be.false;
    });

    it('throws error when _rev does not match with the original doc', async () => {
      const reportInput = {
        _id: '1',
        _rev: '2',
        form: 'pregnancy_danger_sign',
        type: 'data_record',
        reported_date: 12312312,
        contact: {
          _id: '5'
        }
      };
      getDocByIdInner.resolves({...reportInput, _rev: '3'});
      await expect(Report.v1.update(localContext)(reportInput))
        .to.be.rejectedWith('`_rev` does not match');
    });

    it('throws error when update input `form` is invalid', async () => {
      const reportInput = {
        _id: '1',
        _rev: '2',
        form: 'hello world',
        type: 'data_record',
        reported_date: 12312312,
        contact: {
          _id: '5'
        }
      };
      queryDocUuidsByKeyInner.resolves(['form:pregnancy_danger_sign']);
      getDocByIdInner.resolves({...reportInput, form: 'pregnancy_danger_sign'});
      await expect(Report.v1.update(localContext)(reportInput))
        .to.be.rejectedWith('Invalid `form` value');
    });

    it('throws error original doc does not exist', async () => {
      const reportInput = {
        _id: '1',
        _rev: '2',
        form: 'pregnancy_danger_sign',
        type: 'data_record',
        reported_date: 12312312,
        contact: {
          _id: '5'
        }
      };
      getDocByIdInner.resolves(null);
      await expect(Report.v1.update(localContext)(reportInput))
        .to.be.rejectedWith('Report not found');
    });

    it('throws error if contact lineage does not match with the original doc', async() => {
      const reportInput = {
        _id: '1',
        _rev: '2',
        form: 'pregnancy_danger_sign',
        type: 'data_record',
        reported_date: 12312312,
        contact: {
          _id: '5', parent: {_id: '7'}
        }
      };
      getDocByIdInner.resolves({...reportInput, contact: {_id: '5', parent: {_id: '6'}}});
      await expect(Report.v1.update(localContext)(reportInput))
        .to.be.rejectedWith(`contact lineage does not match with the lineage of the doc in the db`);
    });

    it('updates report for valid input', async() => {
      const reportInput = {
        _id: '1',
        _rev: '2',
        form: 'pregnancy_danger_sign',
        type: 'data_record',
        reported_date: 12312312,
        contact: {
          _id: '5', 
          extra: 'field',
          parent: {_id: '7'}
        }
      };
      queryDocUuidsByKeyInner.resolves(['form:pregnancy_danger_sign']);
      getDocByIdInner.resolves({...reportInput, old: true, language: 'English'});
      const modified = {
        ...reportInput, contact: {
          _id: '5', parent: {
            _id: '7'
          }
        }
      };
      updateDocInner.resolves(modified);
      const updatedReport = await Report.v1.update(localContext)(reportInput);
      // ensure dehydrated lineage
      expect(updatedReport).to.deep.equal(modified);
      expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
      expect(updateDocInner.calledOnceWithExactly(reportInput)).to.be.true;
    });
  });
});
