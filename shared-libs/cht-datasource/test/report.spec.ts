import { DataContext, Page } from '../src';
import sinon, { SinonStub } from 'sinon';
import * as Context from '../src/libs/data-context';
import * as Qualifier from '../src/qualifier';
import * as Report from '../src/report';
import { expect } from 'chai';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Core from '../src/libs/core';
import { fakeGenerator } from './utils';
import * as Input from '../src/input';
import { DOC_TYPES, CONTACT_TYPES } from '@medic/constants';

describe('report', () => {
  const dataContext = { bind: () => null } as DataContext;
  let dataContextBind: SinonStub;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;
  let isUuidQualifier: SinonStub;
  let isFreetextQualifier: SinonStub;

  beforeEach(() => {
    dataContextBind = sinon.stub(dataContext, 'bind');
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    adapt = sinon.stub(Context, 'adapt');
    isUuidQualifier = sinon.stub(Qualifier, 'isUuidQualifier');
    isFreetextQualifier = sinon.stub(Qualifier, 'isFreetextQualifier');
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const report = { _id: 'report' } as Report.v1.Report;
      const qualifier = { uuid: report._id } as const;
      let getReport: SinonStub;

      beforeEach(() => {
        getReport = sinon.stub();
        adapt.returns(getReport);
      });

      it('retrieves the report for the given qualifier from the data context', async () => {
        isUuidQualifier.returns(true);
        getReport.resolves(report);

        const result = await Report.v1.get(dataContext)(qualifier);

        expect(result).to.equal(report);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Report.v1.get, Remote.Report.v1.get)).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getReport.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isUuidQualifier.returns(false);

        await expect(Report.v1.get(dataContext)(qualifier))
          .to.be.rejectedWith(`Invalid identifier [${JSON.stringify(qualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Report.v1.get, Remote.Report.v1.get)).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getReport.notCalled).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Report.v1.get(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(isUuidQualifier.notCalled).to.be.true;
        expect(getReport.notCalled).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const report = {
        _id: 'report',
        contact: {
          _id: 'contact_id',
          type: 'person',
          parent: {
            _id: 'parent_id',
            type: CONTACT_TYPES.CLINIC
          }
        }
      } as Report.v1.ReportWithLineage;
      const qualifier = { uuid: report._id } as const;
      let getReportWithLineage: SinonStub;

      beforeEach(() => {
        getReportWithLineage = sinon.stub();
        adapt.returns(getReportWithLineage);
      });

      it('retrieves the report with lineage for the given qualifier from the data context', async () => {
        isUuidQualifier.returns(true);
        getReportWithLineage.resolves(report);

        const result = await Report.v1.getWithLineage(dataContext)(qualifier);

        expect(result).to.equal(report);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(
          dataContext,
          Local.Report.v1.getWithLineage,
          Remote.Report.v1.getWithLineage
        )).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getReportWithLineage.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isUuidQualifier.returns(false);

        await expect(Report.v1.getWithLineage(dataContext)(qualifier))
          .to.be.rejectedWith(`Invalid identifier [${JSON.stringify(qualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(
          dataContext,
          Local.Report.v1.getWithLineage,
          Remote.Report.v1.getWithLineage
        )).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getReportWithLineage.notCalled).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Report.v1.getWithLineage(dataContext))
          .to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(isUuidQualifier.notCalled).to.be.true;
        expect(getReportWithLineage.notCalled).to.be.true;
      });
    });

    // The cursor/limit/qualifier validation, defaults and delegation are exercised once against the shared
    // factory in test/libs/paginated.spec.ts. These tests only assert the per-noun wiring.
    describe('getUuidsPage', () => {
      const cursor = '1';
      const pageData = { data: ['report1', 'report2', 'report3'], cursor };
      const freetextQualifier = { freetext: 'freetext' } as const;
      const invalidFreetextQualifier = { freetext: 'invalid_freetext' } as const;
      let getIdsPage: SinonStub;

      beforeEach(() => {
        getIdsPage = sinon.stub().resolves(pageData);
        adapt.returns(getIdsPage);
      });

      it('delegates to the id-page local/remote implementations', async () => {
        isFreetextQualifier.returns(true);

        const result = await Report.v1.getUuidsPage(dataContext)(freetextQualifier, cursor, 3);

        expect(result).to.equal(pageData);
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Report.v1.getUuidsPage, Remote.Report.v1.getUuidsPage)
        ).to.be.true;
        expect(getIdsPage.calledOnceWithExactly(freetextQualifier, cursor, 3)).to.be.true;
      });

      it('defaults to the ids page limit', async () => {
        isFreetextQualifier.returns(true);

        await Report.v1.getUuidsPage(dataContext)(freetextQualifier);

        expect(getIdsPage.calledOnceWithExactly(freetextQualifier, null, 10000)).to.be.true;
      });

      it('validates with the freetext qualifier assertion', async () => {
        isFreetextQualifier.returns(false);

        await expect(Report.v1.getUuidsPage(dataContext)(invalidFreetextQualifier))
          .to.be.rejectedWith(`Invalid freetext [${JSON.stringify(invalidFreetextQualifier)}].`);
        expect(getIdsPage.notCalled).to.be.true;
      });
    });

    describe('getUuids', () => {
      const freetextQualifier = { freetext: 'freetext' } as const;
      const mockGenerator = {} as AsyncGenerator<string, null>;
      let reportGetIdsPage: SinonStub;
      let getPagedGenerator: SinonStub;

      beforeEach(() => {
        reportGetIdsPage = sinon.stub(Report.v1, 'getUuidsPage');
        dataContext.bind = sinon.stub().returns(reportGetIdsPage);
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator').returns(mockGenerator);
      });

      it('drains the id-page getter into a generator', () => {
        isFreetextQualifier.returns(true);

        const generator = Report.v1.getUuids(dataContext)(freetextQualifier);

        expect(generator).to.equal(mockGenerator);
        expect(getPagedGenerator.calledOnceWithExactly(reportGetIdsPage, freetextQualifier)).to.be.true;
      });

      it('validates with the freetext qualifier assertion', () => {
        isFreetextQualifier.returns(false);

        expect(() => Report.v1.getUuids(dataContext)(freetextQualifier))
          .to.throw(`Invalid freetext [${JSON.stringify(freetextQualifier)}]`);
        expect(getPagedGenerator.notCalled).to.be.true;
      });
    });

    describe('getPage', () => {
      const cursor = '1';
      const pageData = { data: [{ _id: 'report1' }, { _id: 'report2' }] as Report.v1.Report[], cursor };
      let getDocsPage: SinonStub;

      beforeEach(() => {
        getDocsPage = sinon.stub().resolves(pageData);
        adapt.returns(getDocsPage);
      });

      it('delegates to the doc-page local/remote implementations (no qualifier - all reports)', async () => {
        const result = await Report.v1.getPage(dataContext)(undefined, cursor, 3);

        expect(result).to.equal(pageData);
        expect(adapt.calledOnceWithExactly(dataContext, Local.Report.v1.getPage, Remote.Report.v1.getPage)).to.be.true;
        expect(getDocsPage.calledOnceWithExactly(undefined, cursor, 3)).to.be.true;
      });

      it('defaults to the docs page limit', async () => {
        await Report.v1.getPage(dataContext)();

        expect(getDocsPage.calledOnceWithExactly(undefined, null, 100)).to.be.true;
      });

      it('rejects a qualifier (none is supported yet)', async () => {
        await expect(Report.v1.getPage(dataContext)({ unexpected: true } as unknown as undefined))
          .to.be.rejectedWith('Unsupported qualifier [{"unexpected":true}].');
        expect(getDocsPage.notCalled).to.be.true;
      });
    });

    describe('getAll', () => {
      const mockGenerator = {} as AsyncGenerator<Report.v1.Report, null>;
      let boundPage: SinonStub;
      let bind: SinonStub;
      let getPagedGenerator: SinonStub;

      beforeEach(() => {
        boundPage = sinon.stub();
        bind = sinon.stub().returns(boundPage);
        dataContext.bind = bind;
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator').returns(mockGenerator);
      });

      it('returns a generator that drains all reports (no qualifier)', () => {
        const generator = Report.v1.getAll(dataContext)();

        expect(generator).to.equal(mockGenerator);
        expect(bind.calledOnceWithExactly(Report.v1.getPage)).to.be.true;
        expect(getPagedGenerator.calledOnceWithExactly(boundPage, undefined)).to.be.true;
      });
    });

    describe('create', () => {
      let createReportDoc: SinonStub;

      beforeEach(() => {
        createReportDoc = sinon.stub();
        adapt.returns(createReportDoc);
      });


      it('returns report doc for valid input', async () => {
        const input = {
          name: 'report-1',
          type: DOC_TYPES.DATA_RECORD,
          contact: 'c1',
          form: 'form'
        };
        const doc = {
          ...input,
          _id: 'new-doc'
        };
        createReportDoc.resolves(doc);

        const result = await Report.v1.create(dataContext)(input);

        expect(result).to.equal(doc);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Report.v1.create, Remote.Report.v1.create))
          .to.be.true;
        expect(createReportDoc.calledOnceWithExactly(input)).to.be.true;
      });

      it('Throws error is input is not a record', async () => {
        const input = 'hello' as unknown as Input.v1.ReportInput;
        await expect(Report.v1.create(dataContext)(input))
          .to.be.rejectedWith(`Report data not provided.`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Report.v1.create, Remote.Report.v1.create))
          .to.be.true;
        expect(createReportDoc.notCalled).to.be.true;
      });
    });

    describe('update', () => {
      let updateReportDoc: SinonStub;

      beforeEach(() => {
        updateReportDoc = sinon.stub();
        adapt.returns(updateReportDoc);
      });

      it('throws error for invalid input', async () => {
        const input = 'my-string-report' as unknown as Report.v1.Report;

        await expect(Report.v1.update(dataContext)(input))
          .to.be.rejectedWith(`Updated report data not provided.`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Report.v1.update, Remote.Report.v1.update))
          .to.be.true;
        expect(updateReportDoc.notCalled).to.be.true;
      });

      it('returns updated report doc for valid input', async() => {
        const input = {
          _id: 'b8208fa332bf1f09b606e6efd8002a4a',
          _rev: '1-9ffca0e670bcc111de86f68ae8f47d3b',
          form: 'pregnancy_danger_sign',
          type: DOC_TYPES.DATA_RECORD,
          contact: { _id: 'c1', name: 'hydrated contact' },
          reported_date: 12312312,
          fields: {}
        };
        const doc = {
          ...input,
          contact: { _id: input.contact._id }
        };
        updateReportDoc.resolves(doc);

        const result = await Report.v1.update(dataContext)(input);

        expect(result).to.equal(doc);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Report.v1.update, Remote.Report.v1.update))
          .to.be.true;
        expect(updateReportDoc.calledOnceWithExactly(input)).to.be.true;
      });
    });

    describe('getDatasource', () => {
      let report: Report.v1.Datasource;

      beforeEach(() => report = Report.v1.getDatasource(dataContext));

      it('contains expected keys', () => {
        expect(report).to.have.all.keys([
          'getUuidsByFreetext',
          'getUuidsPageByFreetext',
          'getByUuid',
          'create',
          'update',
          'getByUuidWithLineage',
        ]);
      });

      it('getByUuid', async () => {
        const expectedReport = {};
        const reportGet = sinon.stub().resolves(expectedReport);
        dataContextBind.returns(reportGet);
        const qualifier = { uuid: 'my-report-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedReport = await report.getByUuid(qualifier.uuid);

        expect(returnedReport).to.equal(expectedReport);
        expect(dataContextBind.calledOnceWithExactly(Report.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getByUuidWithLineage', async () => {
        const expectedReport = {};
        const reportGet = sinon.stub().resolves(expectedReport);
        dataContextBind.returns(reportGet);
        const qualifier = { uuid: 'my-report-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedReport = await report.getByUuidWithLineage(qualifier.uuid);

        expect(returnedReport).to.equal(expectedReport);
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getWithLineage)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getUuidsPageByFreetext', async () => {
        const expectedReportIds: Page<Report.v1.Report> = { data: [], cursor: null };
        const reportGetIdsPage = sinon.stub().resolves(expectedReportIds);
        dataContextBind.returns(reportGetIdsPage);
        const freetext = 'abc';
        const limit = 2;
        const cursor = '1';
        const qualifier = { freetext };
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(qualifier);

        const returnedContactIds = await report.getUuidsPageByFreetext(freetext, cursor, limit);

        expect(returnedContactIds).to.equal(expectedReportIds);
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(
          reportGetIdsPage.calledOnceWithExactly(qualifier, cursor, limit)
        ).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
      });

      it('getUuidsPageByFreetext uses default cursor and limit', async () => {
        const expectedReportIds: Page<Report.v1.Report> = {data: [], cursor: null};
        const reportGetIdsPage = sinon.stub().resolves(expectedReportIds);
        dataContextBind.returns(reportGetIdsPage);
        const freetext = 'abc';
        const qualifier = { freetext };
        sinon.stub(Qualifier, 'byFreetext').returns(qualifier);

        const returnedContactIds = await report.getUuidsPageByFreetext(freetext);

        expect(returnedContactIds).to.equal(expectedReportIds);
        expect(reportGetIdsPage.calledOnceWithExactly(qualifier, null, 10000)).to.be.true;
      });

      it('getUuidsByFreetext', () => {
        const mockAsyncGenerator = fakeGenerator();

        const contactGetIds = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(contactGetIds);
        const freetext = 'abc';
        const qualifier = { freetext };
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(qualifier);

        const res = report.getUuidsByFreetext(freetext);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuids)).to.be.true;
        expect(contactGetIds.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
      });

      it('create', async () => {
        const reportInput = { form: 'apoorva', type: 'report', contact: 'c1' };
        const expectedReport = {
          ...reportInput,
          reported_date: 12312312
        };
        const reportCreate = sinon.stub().resolves(expectedReport);
        dataContextBind.returns(reportCreate);

        const returnedReport = await report.create(reportInput);

        expect(returnedReport).to.equal(expectedReport);
        expect(dataContextBind.calledOnceWithExactly(Report.v1.create)).to.be.true;
        expect(reportCreate.calledOnceWithExactly(reportInput)).to.be.true;
      });

      it('update', async () => {
        const reportInput = {
          form: 'apoorva',
          type: DOC_TYPES.DATA_RECORD,
          contact: { _id: 'c1' },
          _id: '123',
          _rev: '1-abc',
          reported_date: 12312312,
          fields: {}
        };
        const expectedReport = {
          ...reportInput,
          _rev: '2-def',
        };
        const reportUpdate = sinon.stub().resolves(expectedReport);
        dataContextBind.returns(reportUpdate);

        const returnedPlace = await report.update(reportInput);

        expect(returnedPlace).to.equal(expectedReport);
        expect(dataContextBind.calledOnceWithExactly(Report.v1.update)).to.be.true;
        expect(reportUpdate.calledOnceWithExactly(reportInput)).to.be.true;
      });
    });
  });
});
