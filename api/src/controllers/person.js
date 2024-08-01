const { Person, Qualifier, InvalidArgumentError } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');

const getPerson = ({ with_lineage }) => ctx.bind(
  with_lineage === 'true'
    ? Person.v1.getWithLineage
    : Person.v1.get
);
const getPageByType = () => ctx.bind(Person.v1.getPage);

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, 'can_view_contacts')) {
    return Promise.reject({ code: 403, message: 'Insufficient privileges' });
  }
};

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);
      const { uuid } = req.params;
      const person = await getPerson(req.query)(Qualifier.byUuid(uuid));
      if (!person) {
        return serverUtils.error({ status: 404, message: 'Person not found' }, req, res);
      }
      return res.json(person);
    }),
    getPageByType: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);
      const personType  = Qualifier.byContactType(req.query.personType);
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 100;
      const skip = req.query.skip !== undefined ? Number(req.query.skip) : 0;

      try {
        // TODO: change this when #9281 gets merged
        const docs = await getPageByType()( personType, limit, skip );

        return res.json(docs);
      } catch (err) {
        if (err instanceof InvalidArgumentError) {
          return serverUtils.error({status: 400, message: err.message}, req, res);
        }

        throw err;
      }
    }),
  },
};
