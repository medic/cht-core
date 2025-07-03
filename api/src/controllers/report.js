const auth = require('../auth');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { Report, Qualifier, Input } = require('@medic/cht-datasource');
const { PermissionError } = require('../errors');

const getReport = () => ctx.bind(Report.v1.get);
const getReportIds = () => ctx.bind(Report.v1.getUuidsPage);
const createReport = () => ctx.bind(Report.v1.createReport);

const checkUserPermissions = async (req, permissions = ['can_view_reports']) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, permissions)) {
    throw new PermissionError('Insufficient privileges');
  }
};

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);
      const { uuid } = req.params;
      const report = await getReport()(Qualifier.byUuid(uuid));

      if (!report) {
        return serverUtils.error({ status: 404, message: 'Report not found' }, req, res);
      }

      return res.json(report);
    }),
    getUuids: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);

      const qualifier = Qualifier.byFreetext(req.query.freetext);

      const docs = await getReportIds()(qualifier, req.query.cursor, req.query.limit);

      return res.json(docs);
    }),
    createReport: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req, ['can_view_reports', 'can_create_records']);

      const input = Input.validateReportInput(req.body);
      const reportDoc = await createReport()(input);
      return res.json(reportDoc);
    }),
  }
};
