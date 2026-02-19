const auth = require('../auth');
const { Target, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { PermissionError } = require('../errors');

const getTarget = ctx.bind(Target.v1.get);
const getTargets = ctx.bind(Target.v1.getPage);

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx)) {
    throw new PermissionError('Insufficient privileges');
  }
};

const getContactUuidQualifier = ({ contact_uuids, contact_uuid }) => {
  if (contact_uuid) {
    return Qualifier.byContactUuid(contact_uuid);
  }
  const contactUuids = (contact_uuids ?? '')
    .split(',')
    .filter(Boolean);
  return Qualifier.byContactUuids(contactUuids);
};

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);
      const { uuid } = req.params;
      const target = await getTarget(Qualifier.byUuid(uuid));

      if (!target) {
        return serverUtils.error({ status: 404, message: 'Target not found' }, req, res);
      }

      return res.json(target);
    }),
    getAll: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);

      const docs = await getTargets(
        Qualifier.and(
          getContactUuidQualifier(req.query),
          Qualifier.byReportingPeriod(req.query.reporting_period)
        ),
        req.query.cursor,
        req.query.limit
      );
      
      return res.json(docs);
    }),
  },
};
