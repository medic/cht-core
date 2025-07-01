const { Person, Qualifier, Input } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');
const { PermissionError } = require('../errors');

const getPerson = ({ with_lineage }) => ctx.bind(
  with_lineage === 'true'
    ? Person.v1.getWithLineage
    : Person.v1.get
);
const getPageByType = () => ctx.bind(Person.v1.getPage);
const createPerson = () => ctx.bind(Person.v1.createPerson);

const checkUserPermissions = async (req, permissions = []) => {
  const userCtx = await auth.getUserCtx(req);
  if (permissions.length === 0) {
    permissions = ['can_view_contacts'];
  }
  if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, permissions)){
    throw new PermissionError('Insufficient privileges');
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
    getAll: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);

      const personType  = Qualifier.byContactType(req.query.type);

      const docs = await getPageByType()( personType, req.query.cursor, req.query.limit );

      return res.json(docs);
    }),
    
    createPerson: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req, ['can_view_contacts', 'can_create_records']);

      const personInput = Input.validatePersonInput(req.body);
      const personDoc = await createPerson()(personInput);
      return res.json(personDoc);
    })
  },
};
