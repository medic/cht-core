const sinon = require('sinon');
const auth = require('../../../src/auth');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/report');
const { Report, Qualifier, InvalidArgumentError} = require('@medic/cht-datasource');
const {expect} = require('chai');

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

      afterEach(() => {
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a report', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const report = { name: 'John Doe\'s Report', type: 'data_record', form: 'yes' };
        reportGet.resolves(report);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if contact is not found', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        reportGet.resolves(null);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Report not found' },
          req,
          res
        )).to.be.true;
      });

      it('returns error if user does not have can_view_contacts permission', async () => {
        const error = { code: 403, message: 'Insufficient privileges' };
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(reportGet.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(error, req, res)).to.be.true;
      });

      it('returns error if not an online user', async () => {
        const error = { code: 403, message: 'Insufficient privileges' };
        isOnlineOnly.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.notCalled).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(reportGet.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(error, req, res)).to.be.true;
      });
    });

    describe('getIds', () => {
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
        dataContextBind.withArgs(Report.v1.getIdsPage).returns(reportGetIdsPage);
        qualifierByFreetext.returns(freetextOnlyQualifier);
      });

      afterEach(() => {
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
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

        await controller.v1.getIds(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getIdsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(reports)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns error if user does not have can_view_contacts permission', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        const error = { code: 403, message: 'Insufficient privileges' };
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(false);

        await controller.v1.getIds(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(reportGetIdsPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(error, req, res)).to.be.true;
      });

      it('returns error if not an online user', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        const error = { code: 403, message: 'Insufficient privileges' };
        isOnlineOnly.returns(false);

        await controller.v1.getIds(req, res);

        expect(hasAllPermissions.notCalled).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(reportGetIdsPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(error, req, res)).to.be.true;
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

        await controller.v1.getIds(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getIdsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, limit)).to.be.true;
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
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        reportGetIdsPage.throws(err);

        await controller.v1.getIds(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getIdsPage)).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
      });
    });
  });
});
