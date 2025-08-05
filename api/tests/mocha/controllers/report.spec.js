const sinon = require('sinon');
const auth = require('../../../src/auth');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/report');
const { Report, Qualifier, InvalidArgumentError} = require('@medic/cht-datasource');
const {expect} = require('chai');
const {PermissionError} = require('../../../src/errors');

describe('Report Controller Tests', () => {
  const userCtx = { hello: 'world' };
  let getUserCtx;
  let isOnlineOnly;
  let hasAllPermissions;
  let dataContextBind;
  let serverUtilsError;
  let req;
  let res;

  beforeEach(() => {
    getUserCtx = sinon
      .stub(auth, 'getUserCtx')
      .resolves(userCtx);
    isOnlineOnly = sinon.stub(auth, 'isOnlineOnly');
    hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
    dataContextBind = sinon.stub(dataContext, 'bind');
    serverUtilsError = sinon.stub(serverUtils, 'error');
    res = {
      json: sinon.stub(),
    };
  });


  describe('v1', () => {
    const privilegeError = new PermissionError('Insufficient privileges');

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
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const report = { name: 'John Doe\'s Report', type: 'data_record', form: 'yes' };
        reportGet.resolves(report);

        await controller.v1.get(req, res);

        expect(hasAllPermissions
          .calledOnceWithExactly(userCtx, ['can_view_reports'])).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a 404 error if report is not found', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        reportGet.resolves(null);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, ['can_view_reports'])).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Report not found' },
          req,
          res
        )).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if user does not have can_view_reports permission', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, ['can_view_reports'])).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(reportGet.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if not an online user', async () => {
        isOnlineOnly.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.notCalled).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(reportGet.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });
    });

    describe('getUuids', () => {
      let reportGetIdsPage;
      let qualifierByFreetext;
      const freetext = 'report';
      const invalidFreetext = 'invalidFreetext';
      const freetextOnlyQualifier = { freetext };
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
        qualifierByFreetext.returns(freetextOnlyQualifier);
      });

      it('returns a page of report ids', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        reportGetIdsPage.resolves(reports);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, ['can_view_reports'])).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(reports)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a page of report ids for undefined limit', async () => {
        req = {
          query: {
            freetext,
            cursor,
          }
        };
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        reportGetIdsPage.resolves(reports);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, ['can_view_reports'])).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, undefined)).to.be.true;
        expect(res.json.calledOnceWithExactly(reports)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
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
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        reportGetIdsPage.throws(err);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, ['can_view_reports'])).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, null)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if user does not have can_view_reports permission', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(false);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, ['can_view_reports'])).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(reportGetIdsPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message === privilegeError.message).to.be.true;
        expect(serverUtilsError.firstCall.args[0].code === privilegeError.code).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if not an online user', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        isOnlineOnly.returns(false);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.notCalled).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(reportGetIdsPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message === privilegeError.message).to.be.true;
        expect(serverUtilsError.firstCall.args[0].code === privilegeError.code).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
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
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        reportGetIdsPage.throws(err);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, ['can_view_reports'])).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
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
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        reportGetIdsPage.throws(err);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, ['can_view_reports'])).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
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
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);

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
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(hasAllPermissions.calledOnceWithExactly(userCtx, ['can_view_reports', 'can_create_records'])).to.be.true;
        expect(createReport.called).to.be.false;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(InvalidArgumentError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(error.message);
        expect(dataContextBind.notCalled).to.be.true;
      });

      it('returns a report doc on valid report input', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
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
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true); 
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
    });
  });
});
