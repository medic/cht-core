const auth = require('../auth');
const { Contact, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');

const getContact = ({ with_lineage }) => ctx.bind(with_lineage === 'true' ? Contact.v1.getWithLineage : Contact.v1.get);
const getContactIds = () => ctx.bind(Contact.v1.getUuidsPage);

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, 'can_view_contacts')) {
    throw { code: 403, message: 'Insufficient privileges' };
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
    getUuids: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);

      if (!req.query.freetext && !req.query.type) {
        return serverUtils.error({ status: 400, message: 'Either query param freetext or type is required' }, req, res);
      }
      const qualifier = {};

      if (req.query.freetext) {
        Object.assign(qualifier, Qualifier.byFreetext(req.query.freetext));
      }

      if (req.query.type) {
        Object.assign(qualifier, Qualifier.byContactType(req.query.type));
      }

      const docs = await getContactIds()(qualifier, req.query.cursor, req.query.limit);

      return res.json(docs);
    }),
  },
};
