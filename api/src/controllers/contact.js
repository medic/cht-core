const auth = require('../auth');
const { Contact, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');

const getContact = ({ with_lineage }) => ctx.bind(with_lineage === 'true' ? Contact.v1.getWithLineage : Contact.v1.get);
const getContactIds = () => ctx.bind(Contact.v1.getIdsPage);

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
      const contact = await getContact(req.query)(Qualifier.byUuid(uuid));

      if (!contact) {
        return serverUtils.error({ status: 404, message: 'Contact not found' }, req, res);
      }

      return res.json(contact);
    }),
    getIds: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);

      const qualifier = Qualifier.byFreetext(req.query.freetext);
      const limit = req.query.limit ? Number(req.query.limit) : req.query.limit;

      const docs = await getContactIds()(qualifier, req.query.cursor, limit);

      return res.json(docs);
    }),
  },
};
