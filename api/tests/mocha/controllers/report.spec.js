const sinon = require('sinon');
const auth = require('../../../src/auth');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const { Report, Qualifier} = require('@medic/cht-datasource');
const {expect} = require('chai');

describe('Report Controller Tests', () => {
  const sandbox = sinon.createSandbox();
  const reportGet = sandbox.stub();
  const reportGetWithLineage = sandbox.stub();
  const reportGetIdsPage = sandbox.stub();
  const createReport = sandbox.stub();
  const updateReport = sandbox.stub();

  let serverUtilsError;
  let assertPermissions;
  let req;
  let res;
  let controller;

  before(() => {
    const bind = sinon.stub(dataContext, 'bind');
    bind.withArgs(Report.v1.get).returns(reportGet);
    bind.withArgs(Report.v1.getWithLineage).returns(reportGetWithLineage);
    bind.withArgs(Report.v1.getUuidsPage).returns(reportGetIdsPage);
    bind.withArgs(Report.v1.create).returns(createReport);
    bind.withArgs(Report.v1.update).returns(updateReport);
    controller = require('../../../src/controllers/report');
  });

  beforeEach(() => {
    serverUtilsError = sinon.stub(serverUtils, 'error');
    assertPermissions = sinon.stub(auth, 'assertPermissions').resolves();
    res = {
      json: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
    sandbox.reset();
  });

  describe('v1', () => {
    describe('get', () => {
      beforeEach(() => {
        req = {
          params: { uuid: 'uuid' },
          query: { }
        };
      });

      it('returns a report', async () => {
        const report = { name: 'John Doe\'s Report', type: 'data_record', form: 'yes' };
        reportGet.resolves(report);

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a report with lineage when the query parameter is set to "true"', async () => {
        const report = { name: 'John Doe\'s Report', type: 'data_record', form: 'yes' };
        reportGetWithLineage.resolves(report);
        req.query.with_lineage = 'true';

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGet.notCalled).to.be.true;
        expect(reportGetWithLineage.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a report without lineage when the query parameter is set something else', async () => {
        const report = { name: 'John Doe\'s Report', type: 'data_record', form: 'yes' };
        reportGet.resolves(report);
        req.query.with_lineage = '1';

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(reportGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if report is not found', async () => {
        reportGet.resolves(null);
        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Report not found' },
          req,
          res
        )).to.be.true;
      });
    });

    describe('getUuids', () => {
      const freetext = 'report';
      const freetexQualifier = Qualifier.byFreetext(freetext);
      const report = { name: 'Nice report', type: 'data_record', form: 'yes' };
      const limit = 100;
      const cursor = null;
      const reports = Array.from({ length: 3 }, () => ({ ...report }));

      beforeEach(() => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
      });

      it('returns a page of report ids', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        reportGetIdsPage.resolves(reports);

        await controller.v1.getUuids(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetexQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(reports)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a page of report ids for undefined limit', async () => {
        req = {
          query: {
            freetext,
            cursor,
          }
        };
        reportGetIdsPage.resolves(reports);

        await controller.v1.getUuids(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetexQualifier, cursor, undefined)).to.be.true;
        expect(res.json.calledOnceWithExactly(reports)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });
    });

    describe('create', () => {
      it('returns a report doc on valid report input', async () => {
        const input = {
          type: 'report',
          reported_date: 12312312,
          form: 'form-1',
          contact: 'c1'
        };
        req = { body: input };
        const report = { ...input, _id: '1-id', _rev: '1-rev' };
        createReport.resolves(report);

        await controller.v1.create(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAny: ['can_create_records', 'can_edit'] }
        )).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(createReport.calledOnceWithExactly(input)).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
      });
    });

    describe('update', () => {
      it('updates report for valid update input', async() => {
        const updateInput = {
          type: 'report',
          reported_date: 12312312,
          _id: '1',
          _rev: '2',
          contact: {
            _id: '3'
          },
          form: 'abcd'
        };
        req = {
          params: { uuid: '1' },
          body: updateInput
        };
        const updatedReport = { ...updateInput, rev: '2-rev' };
        updateReport.resolves(updatedReport);

        await controller.v1.update(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAny: ['can_update_reports', 'can_edit'] }
        )).to.be.true;
        expect(updateReport.calledOnceWithExactly(updateInput)).to.be.true;
        expect(serverUtilsError.called).to.be.false;
        expect(res.json.calledOnceWithExactly(updatedReport)).to.be.true;
      });
    });
  });
});
