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
const createPerson = () => ctx.bind(Person.v1.create);
const updatePerson = () => ctx.bind(Person.v1.update);

const checkUserPermissions = async (req, permissions = ['can_view_contacts'], altPermissions = []) => {
  const userCtx = await auth.getUserCtx(req);
  const isOnlineUser = auth.isOnlineOnly(userCtx);
  const hasPrimaryPermissions = auth.hasAllPermissions(userCtx, permissions);
  const hasAlternativePermissions = altPermissions.length > 0 && auth.hasAllPermissions(userCtx, altPermissions);

  if (!isOnlineUser || (!hasRegularPermissions && !hasAlternativePermissions)) {
    throw new PermissionError('Insufficient privileges');
  }
};

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req, ['can_view_contacts']);
      const { uuid } = req.params;
      const person = await getPerson(req.query)(Qualifier.byUuid(uuid));
      if (!person) {
        return serverUtils.error({ status: 404, message: 'Person not found' }, req, res);
      }
      return res.json(person);
    }),
    getAll: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req, ['can_view_contacts']);

      const personType  = Qualifier.byContactType(req.query.type);

      const docs = await getPageByType()( personType, req.query.cursor, req.query.limit );

      return res.json(docs);
    }),
    
    create: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req, ['can_view_contacts', 'can_create_people'], ['can_edit']);

      const personInput = Input.validatePersonInput(req.body);
      const personDoc = await createPerson()(personInput);
      return res.json(personDoc);
    }),

    update: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req, ['can_view_contacts', 'can_update_people'], ['can_edit']);

      const updatePersonInput = req.body;
      const updatedPersonDoc = await updatePerson()(updatePersonInput);
      return res.json(updatedPersonDoc);
    }),
    checkUserPermissions
  },
};
