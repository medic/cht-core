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

const getContactIdQualifier = ({ contact_ids, contact_id }) => {
  if (contact_id) {
    return Qualifier.byContactId(contact_id);
  }
  const contactIds = (contact_ids ?? '')
    .split(',')
    .filter(Boolean);
  return Qualifier.byContactIds(contactIds);
};

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);
      const { id } = req.params;
      const target = await getTarget(Qualifier.byId(id));

      if (!target) {
        return serverUtils.error({ status: 404, message: 'Target not found' }, req, res);
      }

      return res.json(target);
    }),
    getAll: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);

      const docs = await getTargets(
        Qualifier.and(
          getContactIdQualifier(req.query),
          Qualifier.byReportingPeriod(req.query.reporting_period)
        ),
        req.query.cursor,
        req.query.limit
      );
      
      return res.json(docs);
    }),
  },
};
