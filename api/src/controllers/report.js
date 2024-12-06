const auth = require('../auth');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { Report, Qualifier } = require('@medic/cht-datasource');

const getReport = () => ctx.bind(Report.v1.get);
const getReportIds = () => ctx.bind(Report.v1.getIdsPage);

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, 'can_view_reports')) {
    return Promise.reject({ code: 403, message: 'Insufficient privileges' });
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
    getIds: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);

      const qualifier = Qualifier.byFreetext(req.query.freetext);

      const docs = await getReportIds()(qualifier, req.query.cursor, req.query.limit);

      return res.json(docs);
    })
  }
};
