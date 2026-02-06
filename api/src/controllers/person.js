const { Person, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');

const getPerson = ctx.bind(Person.v1.get);
const getPersonWithLineage = ctx.bind(Person.v1.getWithLineage);
const getPage = ctx.bind(Person.v1.getPage);
const createPerson = ctx.bind(Person.v1.create);
const updatePerson = ctx.bind(Person.v1.update);

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_contacts'] });
      const { params: { uuid }, query: { with_lineage } } = req;
      const getPersonRecord = with_lineage === 'true' ? getPersonWithLineage : getPerson;
      const person = await getPersonRecord(Qualifier.byUuid(uuid));
      if (!person) {
        return serverUtils.error({ status: 404, message: 'Person not found' }, req, res);
      }

      return res.json(person);
    }),
    getAll: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_contacts'] });
      const personType = Qualifier.byContactType(req.query.type);
      const docs = await getPage(personType, req.query.cursor, req.query.limit);
      return res.json(docs);
    }),

    create: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_create_people', 'can_edit'] });
      const personDoc = await createPerson(req.body);
      return res.json(personDoc);
    }),

    update: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_update_people', 'can_edit'] });
      const { params: { uuid }, body } = req;
      const updatePersonInput = {
        ...body,
        _id: uuid,
      };
      const updatedPersonDoc = await updatePerson(updatePersonInput);
      return res.json(updatedPersonDoc);
    }),
  },
};
