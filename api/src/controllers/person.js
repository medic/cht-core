const { Person, Qualifier } = require('@medic/cht-datasource');
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

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, 'can_view_contacts')) {
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
    create: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissionsForEdit(req);

      const person = await createPerson()(req.body);

      return res.json(person);
    }),
    update: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissionsForEdit(req);

      const { uuid } = req.params;
      const person = await updatePerson()({
        ...req.body,
        _id: uuid,
      });

      return res.json(person);
    }),
  },
};
