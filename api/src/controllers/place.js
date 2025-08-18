const { Place, Qualifier, Input } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');


const getPlace = ({ with_lineage }) => ctx.bind(
  with_lineage === 'true'
    ? Place.v1.getWithLineage
    : Place.v1.get
);

const getPageByType = () => ctx.bind(Place.v1.getPage);
const create = () => ctx.bind(Place.v1.create);
const update = () => ctx.bind(Place.v1.update);

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await auth.checkUserPermissions(req, ['can_view_contacts']);
      const { uuid } = req.params;
      const place = await getPlace(req.query)(Qualifier.byUuid(uuid));
      if (!place) {
        return serverUtils.error({ status: 404, message: 'Place not found' }, req, res);
      }
      return res.json(place);
    }),
    getAll: serverUtils.doOrError(async (req, res) => {
      await auth.checkUserPermissions(req, ['can_view_contacts']);

      const placeType = Qualifier.byContactType(req.query.type);

      const docs = await getPageByType()( placeType, req.query.cursor, req.query.limit );

      return res.json(docs);
    }),
    create: serverUtils.doOrError(async (req, res) => {
      await auth.checkUserPermissions(req, ['can_view_contacts', 'can_create_places'], ['can_edit']);
      
      const placeInput = Input.validatePlaceInput(req.body);
      const placeDoc = await create()(placeInput);
      return res.json(placeDoc);
    }),
    update: serverUtils.doOrError(async (req, res) => {
      await auth.checkUserPermissions(req, ['can_view_contacts', 'can_update_places'], ['can_edit']);
      
      const updatedPlaceDoc = await update()(req.body);
      return res.json(updatedPlaceDoc);
    })
  }
};
