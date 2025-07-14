const auth = require('../auth');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { Report, Qualifier } = require('@medic/cht-datasource');
const { PermissionError } = require('../errors');

const getReport = ({ with_lineage }) => ctx.bind( with_lineage === 'true' ? Report.v1.getWithLineage : Report.v1.get );
const getReportIds = () => ctx.bind(Report.v1.getUuidsPage);

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, 'can_view_reports')) {
    throw new PermissionError('Insufficient privileges');
  }
};

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);
      const { uuid } = req.params;
      const report = await getReport(req.query)(Qualifier.byUuid(uuid));

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
    })
  }
};
