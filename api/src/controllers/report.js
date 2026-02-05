const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { Report, Qualifier } = require('@medic/cht-datasource');
const auth = require('../auth');

const getReport = ({ with_lineage }) => ctx.bind(with_lineage === 'true' ? Report.v1.getWithLineage : Report.v1.get);
const getReportIds = () => ctx.bind(Report.v1.getUuidsPage);
const create = () => ctx.bind(Report.v1.create);
const update = () => ctx.bind(Report.v1.update);

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_reports'] });
      const { uuid } = req.params;
      const report = await getReport(req.query)(Qualifier.byUuid(uuid));

      if (!report) {
        return serverUtils.error({ status: 404, message: 'Report not found' }, req, res);
      }

      return res.json(report);
    }),

    getUuids: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_reports'] });

      const qualifier = Qualifier.byFreetext(req.query.freetext);

      const docs = await getReportIds()(qualifier, req.query.cursor, req.query.limit);

      return res.json(docs);
    }),

    create: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_create_records', 'can_edit'] });
      const reportDoc = await create()(req.body);
      return res.json(reportDoc);
    }),

    update: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_update_reports', 'can_edit'] });

      const { uuid } = req.params;
      const updateReportInput = {
        ...req.body,
        _id: uuid,
      };
      const updatedReportDoc = await update()(updateReportInput);
      return res.json(updatedReportDoc);
    }),
  }
};
