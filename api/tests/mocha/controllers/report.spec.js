const sinon = require('sinon');
const auth = require('../../../src/auth');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/report');
const { Report, Qualifier, InvalidArgumentError} = require('@medic/cht-datasource');
const {expect} = require('chai');
const {PermissionError} = require('../../../src/errors');

describe('Report Controller Tests', () => {
  let dataContextBind;
  let serverUtilsError;
  let checkUserPermissions;
  let req;
  let res;

  beforeEach(() => {
    dataContextBind = sinon.stub(dataContext, 'bind');
    serverUtilsError = sinon.stub(serverUtils, 'error');
    checkUserPermissions = sinon.stub(auth, 'checkUserPermissions');
    res = {
      json: sinon.stub(),
    };
  });

  describe('v1', () => {
    describe('get', () => {
      let reportGet;

      beforeEach(() => {
        req = {
          params: { uuid: 'uuid' },
          query: { }
        };
        reportGet = sinon.stub();
        dataContextBind
          .withArgs(Report.v1.get)
          .returns(reportGet);
      });

      it('returns a report', async () => {
        checkUserPermissions.resolves();
        const report = { name: 'John Doe\'s Report', type: 'data_record', form: 'yes' };
        reportGet.resolves(report);

        await controller.v1.get(req, res);
       

        expect(
          checkUserPermissions.calledOnceWithExactly(
            req,
            sinon.match(['can_view_reports'])
          )
        ).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if report is not found', async () => {
        reportGet.resolves(null);
        checkUserPermissions.resolves();
        await controller.v1.get(req, res);

        expect(
          checkUserPermissions.calledOnceWithExactly(
            req,
            sinon.match(['can_view_reports'])
          )
        ).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Report not found' },
          req,
          res
        )).to.be.true;
      });

      it('returns error if user does not have can_view_reports permission', async () => {
        const privilegeError = new PermissionError('Insufficient Privileges');
        checkUserPermissions.rejects(privilegeError);
        await controller.v1.get(req, res);

        expect(dataContextBind.notCalled).to.be.true;
        expect(reportGet.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
      });

      it('returns error if not an online user', async () => {
        const privilegeError = new PermissionError('Insufficient Privileges');
        checkUserPermissions.rejects(privilegeError);
        await controller.v1.get(req, res);

        expect(dataContextBind.notCalled).to.be.true;
        expect(reportGet.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
      });
    });

    describe('getUuids', () => {
      let reportGetIdsPage;
      let qualifierByFreetext;
      const freetext = 'report';
      const invalidFreetext = 'invalidFreetext';
      const freetexQualifier = { freetext };
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
        reportGetIdsPage = sinon.stub();
        qualifierByFreetext = sinon.stub(Qualifier, 'byFreetext');
        dataContextBind.withArgs(Report.v1.getUuidsPage).returns(reportGetIdsPage);
        qualifierByFreetext.returns(freetexQualifier);
      });

      it('returns a page of report ids', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        checkUserPermissions.resolves();
        reportGetIdsPage.resolves(reports);

        await controller.v1.getUuids(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_reports'])).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
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
        checkUserPermissions.resolves();
        reportGetIdsPage.resolves(reports);

        await controller.v1.getUuids(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_reports'])).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetexQualifier, cursor, undefined)).to.be.true;
        expect(res.json.calledOnceWithExactly(reports)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns error for null limit', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit: null
          }
        };
        const err = new InvalidArgumentError(`The limit must be a positive integer: [NaN].`);
        reportGetIdsPage.throws(err);
        checkUserPermissions.resolves();

        await controller.v1.getUuids(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_reports'])).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetexQualifier, cursor, null)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
      });

      it('returns error if user does not have can_view_reports permission', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        const privilegeError = new PermissionError('Insufficient Privileges');
        checkUserPermissions.rejects(privilegeError);
        await controller.v1.getUuids(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_reports'])).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(reportGetIdsPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message === privilegeError.message).to.be.true;
        expect(serverUtilsError.firstCall.args[0].code === privilegeError.code).to.be.true;
      });

      it('returns error if not an online user', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        const privilegeError = new PermissionError('Insufficient Privileges');
        checkUserPermissions.rejects(privilegeError);

        await controller.v1.getUuids(req, res);

        expect(dataContextBind.notCalled).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(reportGetIdsPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message === privilegeError.message).to.be.true;
        expect(serverUtilsError.firstCall.args[0].code === privilegeError.code).to.be.true;
      });

      it('returns 400 error when freetext is invalid', async () => {
        req = {
          query: {
            freetext: invalidFreetext,
            cursor,
            limit,
          }
        };
        const err = new InvalidArgumentError(`Invalid freetext: [${invalidFreetext}]`);
        reportGetIdsPage.throws(err);
        checkUserPermissions.resolves();

        await controller.v1.getUuids(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_reports'])).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetexQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
      });

      it('rethrows error in case of other errors', async () => {
        req = {
          query: {
            freetext: freetext,
            cursor,
            limit,
          }
        };
        const err = new Error('error');
        checkUserPermissions.resolves();
        reportGetIdsPage.throws(err);

        await controller.v1.getUuids(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_reports'])).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetexQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
      });
    });

    describe('create', () => {
      let createReport;

      beforeEach(() => {
        createReport = sinon.stub();
        dataContextBind
          .withArgs(Report.v1.create)
          .returns(createReport);
      });

      it('throws error for missing required types, here `contact`', async () => {
        checkUserPermissions.resolves();
        const input = {
          type: 'report',
          reported_date: 12312312
        };
        req = {
          body: {
            ...input
          }
        };

        const error = new InvalidArgumentError(`Missing or empty required field (contact) in [${
          JSON.stringify(input)
        }].`);

        await controller.v1.create(req, res);
        expect(checkUserPermissions
          .calledOnceWithExactly(req, ['can_view_reports', 'can_create_records'])).to.be.true;
        expect(createReport.called).to.be.false;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(InvalidArgumentError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(error.message);
        expect(dataContextBind.notCalled).to.be.true;
      });

      it('returns a report doc on valid report input', async () => {
        checkUserPermissions.resolves();
        const input = {
          type: 'report',
          reported_date: 12312312,
          form: 'form-1',
          contact: 'c1'
        };
        req = {
          body: {
            ...input
          }
        };
        const report = {...input, _id: '1-id', _rev: '1-rev'};
        createReport.resolves(report);
        await controller.v1.create(req, res);
        expect(serverUtilsError.called).to.be.false;
        expect(createReport.calledOnce).to.be.true;
        expect(dataContextBind.calledOnce).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
      });
    });

    describe('update', () => {
      let updateReport;
      beforeEach(() => {
        updateReport = sinon.stub();
        dataContextBind
          .withArgs(Report.v1.update)
          .returns(updateReport);
      });

      it('updates report for valid update input', async() => {
        checkUserPermissions.resolves();
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
          body: {
            ...updateInput
          }
        };
        updateReport.resolves(updateInput);

        await controller.v1.update(req, res);

        expect(updateReport.calledOnce).to.be.true;
        expect(serverUtilsError.called).to.be.false;
        expect(dataContextBind.calledOnce).to.be.true;
        expect(res.json.calledOnceWithExactly(updateInput)).to.be.true;
      });

      it('throws error when the user is not an online user', async() => {
        const privilegeError = new PermissionError('Insufficient Privileges');
        checkUserPermissions.rejects(privilegeError);
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
          body: {
            ...updateInput
          }
        };
        await controller.v1.update(req, res);

        expect(dataContextBind.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(updateReport.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message === privilegeError.message).to.be.true;
        expect(serverUtilsError.firstCall.args[0].code === privilegeError.code).to.be.true;
      });

      it('rethrows error in case of other errors', async () => {
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
          body: {
            ...updateInput
          }
        };

        const err = new Error('error');
        checkUserPermissions.resolves();
        updateReport.throws(err);

        await controller.v1.update(req, res);

        expect(checkUserPermissions.calledOnceWithExactly(req, ['can_view_reports', 'can_update_records'])).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.update)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(updateReport.calledOnce).to.be.true;
        expect(serverUtilsError.called).to.be.true;
      });
    });
  });
});
