const auth = require('../auth');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { Report, Qualifier } = require('@medic/cht-datasource');
const { PermissionError } = require('../errors');

const getReport = ({ with_lineage }) => ctx.bind( with_lineage === 'true' ? Report.v1.getWithLineage : Report.v1.get );
const getReportIds = () => ctx.bind(Report.v1.getUuidsPage);
const createReport = () => ctx.bind(Report.v1.create);
const updateReport = () => ctx.bind(Report.v1.update);

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, 'can_view_reports')) {
    throw new PermissionError('Insufficient privileges');
  }
};

const checkUserPermissionsForEdit = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, 'can_edit')) {
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
    }),
    create: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissionsForEdit(req);

      const report = await createReport()(req.body);

      return res.json(report);
    }),
    update: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissionsForEdit(req);

      const { uuid } = req.params;
      const report = await updateReport()({
        ...req.body,
        _id: uuid,
      });

      return res.json(report);
    }),
  }
};
