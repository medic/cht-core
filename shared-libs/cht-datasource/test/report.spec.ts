import { DataContext, Input } from '../src';
import sinon, { SinonStub } from 'sinon';
import * as Context from '../src/libs/data-context';
import * as Qualifier from '../src/qualifier';
import * as Report from '../src/report';
import { expect } from 'chai';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Core from '../src/libs/core';

describe('report', () => {
  const dataContext = {} as DataContext;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;
  let isUuidQualifier: SinonStub;
  let isFreetextQualifier: SinonStub;
  let isRecord: SinonStub;
  let validateReportInput: SinonStub;
  beforeEach(() => {
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    adapt = sinon.stub(Context, 'adapt');
    isUuidQualifier = sinon.stub(Qualifier, 'isUuidQualifier');
    isFreetextQualifier = sinon.stub(Qualifier, 'isFreetextQualifier');
    isRecord = sinon.stub(Core, 'isRecord');
    validateReportInput = sinon.stub(Input, 'validateReportInput');
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
            type: 'clinic'
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

    describe('getUuidsPage', () => {
      const ids = [ 'report1', 'report2', 'report3' ];
      const cursor = '1';
      const pageData = { data: ids, cursor };
      const limit = 3;
      const stringifiedLimit = '3';
      const freetextQualifier = { freetext: 'freetext' } as const;
      const invalidFreetextQualifier = { freetext: 'invalid_freetext' } as const;
      let getIdsPage: SinonStub;

      beforeEach(() => {
        getIdsPage = sinon.stub();
        adapt.returns(getIdsPage);
      });

      it('retrieves report ids from the data context when cursor is null', async () => {
        isFreetextQualifier.returns(true);
        getIdsPage.resolves(pageData);

        const result = await Report.v1.getUuidsPage(dataContext)(freetextQualifier, null, limit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Report.v1.getUuidsPage, Remote.Report.v1.getUuidsPage)
        ).to.be.true;
        expect(getIdsPage.calledOnceWithExactly(freetextQualifier, null, limit)).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(freetextQualifier)).to.be.true;
      });

      it('retrieves report ids from the data context when cursor is not null', async () => {
        isFreetextQualifier.returns(true);
        getIdsPage.resolves(pageData);

        const result = await Report.v1.getUuidsPage(dataContext)(freetextQualifier, cursor, limit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Report.v1.getUuidsPage, Remote.Report.v1.getUuidsPage)
        ).to.be.true;
        expect(getIdsPage.calledOnceWithExactly(freetextQualifier, cursor, limit)).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(freetextQualifier)).to.be.true;
      });

      it('retrieves report ids from the data context when cursor is not null and ' +
        'limit is stringified number', async () => {
        isFreetextQualifier.returns(true);
        getIdsPage.resolves(pageData);

        const result = await Report.v1.getUuidsPage(dataContext)(freetextQualifier, cursor, stringifiedLimit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Report.v1.getUuidsPage, Remote.Report.v1.getUuidsPage)
        ).to.be.true;
        expect(getIdsPage.calledOnceWithExactly(freetextQualifier, cursor, limit)).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(freetextQualifier)).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        isFreetextQualifier.returns(true);
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Report.v1.getUuidsPage(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(getIdsPage.notCalled).to.be.true;
        expect(isFreetextQualifier.notCalled).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isFreetextQualifier.returns(false);

        await expect(Report.v1.getUuidsPage(dataContext)(invalidFreetextQualifier, cursor, limit))
          .to.be.rejectedWith(`Invalid freetext [${JSON.stringify(invalidFreetextQualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Report.v1.getUuidsPage, Remote.Report.v1.getUuidsPage)
        ).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(invalidFreetextQualifier)).to.be.true;
        expect(getIdsPage.notCalled).to.be.true;
      });

      [
        -1,
        null,
        {},
        '',
        0,
        1.1,
        false
      ].forEach((limitValue) => {
        it(`throws an error if limit is invalid: ${JSON.stringify(limitValue)}`, async () => {
          isFreetextQualifier.returns(true);
          getIdsPage.resolves(pageData);

          await expect(Report.v1.getUuidsPage(dataContext)(freetextQualifier, cursor, limitValue as number))
            .to.be.rejectedWith(`The limit must be a positive integer: [${JSON.stringify(limitValue)}]`);

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(adapt.calledOnceWithExactly(dataContext, Local.Report.v1.getUuidsPage, Remote.Report.v1.getUuidsPage))
            .to.be.true;
          expect(isFreetextQualifier.calledOnceWithExactly(freetextQualifier)).to.be.true;
          expect(getIdsPage.notCalled).to.be.true;
        });
      });

      [
        {},
        '',
        1,
        false,
      ].forEach((skipValue) => {
        it('throws an error if cursor is invalid', async () => {
          isFreetextQualifier.returns(true);
          getIdsPage.resolves(pageData);

          await expect(Report.v1.getUuidsPage(dataContext)(freetextQualifier, skipValue as string, limit))
            .to.be.rejectedWith(`The cursor must be a string or null for first page: [${JSON.stringify(skipValue)}]`);

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(adapt.calledOnceWithExactly(dataContext, Local.Report.v1.getUuidsPage, Remote.Report.v1.getUuidsPage))
            .to.be.true;
          expect(isFreetextQualifier.calledOnceWithExactly(freetextQualifier)).to.be.true;
          expect(getIdsPage.notCalled).to.be.true;
        });
      });
    });

    describe('getUuids', () => {
      const freetextQualifier = { freetext: 'freetext' } as const;
      const reportIds = [ 'report1', 'report2', 'report3' ];
      const mockGenerator = function* () {
        for (const reportId of reportIds) {
          yield reportId;
        }
      };

      let reportGetIdsPage: sinon.SinonStub;
      let getPagedGenerator: sinon.SinonStub;

      beforeEach(() => {
        reportGetIdsPage = sinon.stub(Report.v1, 'getUuidsPage');
        dataContext.bind = sinon.stub().returns(reportGetIdsPage);
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator');
      });

      it('should get report generator with correct parameters', () => {
        isFreetextQualifier.returns(true);
        getPagedGenerator.returns(mockGenerator);

        const generator = Report.v1.getUuids(dataContext)(freetextQualifier);

        expect(generator).to.deep.equal(mockGenerator);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(getPagedGenerator.calledOnceWithExactly(reportGetIdsPage, freetextQualifier)).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(freetextQualifier)).to.be.true;
      });

      it('should throw an error for invalid datacontext', () => {
        const errMsg = 'Invalid data context [null].';
        isFreetextQualifier.returns(true);
        assertDataContext.throws(new Error(errMsg));

        expect(() => Report.v1.getUuids(dataContext)).to.throw(errMsg);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(reportGetIdsPage.notCalled).to.be.true;
        expect(isFreetextQualifier.notCalled).to.be.true;
      });

      it('should throw an error for invalid freetext', () => {
        isFreetextQualifier.returns(false);

        expect(() => Report.v1.getUuids(dataContext)(freetextQualifier))
          .to.throw(`Invalid freetext [${JSON.stringify(freetextQualifier)}]`);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(reportGetIdsPage.notCalled).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(freetextQualifier)).to.be.true;
      });
    });

    describe('create', () => {
      it('throws error for invalid input', async () => {
        const input = {
          name: 'person-1',
          type: 'data_record',
          form: 'yes',
        };
        validateReportInput.throws(
          `Missing or empty required field (contact) in [${JSON.stringify(input)}].`
        );
        await expect(Report.v1.create(dataContext)(input))
          .to.be.rejectedWith(`Missing or empty required field (contact) in [${JSON.stringify(input)}].`);
      });

      it('returns person doc for valid input', async () => {
        const createReportDoc = sinon.stub();
        adapt.returns(createReportDoc);
        const input = {
          name: 'report-1',
          type: 'data_record',
          contact: 'c1',
          form: 'form'
        };
        validateReportInput.returns(input);
        createReportDoc.resolves(input);
        const result = await Report.v1.create(dataContext)(input);
        expect(result).to.deep.equal(input);
      });

    });
    describe('update', () => {
      it('throws error for invalid input', async () => {
        const input = 'my-string-report';
        isRecord.returns(false);
        await expect(Report.v1.update(dataContext)(input))
          .to.be.rejectedWith(`Invalid report update input`);
      });

      it('returns updated report doc for valid input', async() => {
        const updateReportDoc = sinon.stub();
        adapt.returns(updateReportDoc);
        const input = {
          '_id': 'b8208fa332bf1f09b606e6efd8002a4a',
          '_rev': '1-9ffca0e670bcc111de86f68ae8f47d3b',
          'form': 'pregnancy_danger_sign',
          'type': 'data_record',
          'reported_date': '2025-08-24T11:37:06.815Z'
        };
        isRecord.returns(true);
        updateReportDoc.resolves(input);
        const result = await Report.v1.update(dataContext)(input);
        expect(result).to.deep.equal(input);
      });
    });
  });
});
