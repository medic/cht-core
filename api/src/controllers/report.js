const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { Report, Qualifier, Input } = require('@medic/cht-datasource');
const auth = require('../auth');

const getReport = () => ctx.bind(Report.v1.get);
const getReportIds = () => ctx.bind(Report.v1.getUuidsPage);
const create = () => ctx.bind(Report.v1.create);

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await auth.checkUserPermissions(req, ['can_view_reports']);
      const { uuid } = req.params;
      const report = await getReport()(Qualifier.byUuid(uuid));

      if (!report) {
        return serverUtils.error({ status: 404, message: 'Report not found' }, req, res);
      }

      return res.json(report);
    }),
    getUuids: serverUtils.doOrError(async (req, res) => {
      await auth.checkUserPermissions(req, ['can_view_reports']);

      const qualifier = Qualifier.byFreetext(req.query.freetext);

      const docs = await getReportIds()(qualifier, req.query.cursor, req.query.limit);

      return res.json(docs);
    }),
    create: serverUtils.doOrError(async (req, res) => {
      await auth.checkUserPermissions(req, ['can_view_reports', 'can_create_records']);

      const input = Input.validateReportInput(req.body);
      const reportDoc = await create()(input);
      return res.json(reportDoc);
    }),
  }
};
