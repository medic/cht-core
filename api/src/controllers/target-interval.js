const auth = require('../auth');
const { TargetInterval, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { PermissionError } = require('../errors');

const getTargetInterval = ctx.bind(TargetInterval.v1.get);
const getTargetIntervals = ctx.bind(TargetInterval.v1.getAll);

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx)) {
    throw new PermissionError('Insufficient privileges');
  }
};

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);
      const { uuid } = req.params;
      const targetInterval = await getTargetInterval(Qualifier.byUuid(uuid));

      if (!targetInterval) {
        return serverUtils.error({ status: 404, message: 'Target interval not found' }, req, res);
      }

      return res.json(targetInterval);
    }),
    getAll: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);

      const reportingPeriod = Qualifier.byReportingPeriod(req.query.reporting_period);
      const contactUuids = Qualifier.byContactUuids(req.query.contact_uuids);
      const docs = await getTargetIntervals()(
        {...reportingPeriod, ...contactUuids}, 
        req.query.cursor, 
        req.query.limit 
      );

      return res.json(docs);
    }),
  },
};
