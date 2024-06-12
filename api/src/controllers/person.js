const { Person, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');

const getPerson = ({ with_lineage }) => ctx.bind(
  with_lineage
    ? Person.v1.getWithLineage
    : Person.v1.get
);

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await auth.check(req, 'can_view_contacts');
      const { uuid } = req.params;
      const person = await getPerson(req.query)(Qualifier.byUuid(uuid));
      if (!person) {
        return serverUtils.error({ status: 404, message: 'Person not found' }, req, res);
      }
      return res.json(person);
    })
  }
};
