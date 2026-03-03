const { Place, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');

const getPlace = ctx.bind(Place.v1.get);
const getPlaceWithLineage = ctx.bind(Place.v1.getWithLineage);
const getPageByType = ctx.bind(Place.v1.getPage);
const create = ctx.bind(Place.v1.create);
const update = ctx.bind(Place.v1.update);

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_contacts'] });
      const { params: { uuid }, query: { with_lineage } } = req;
      const getPlaceRecord = with_lineage === 'true' ? getPlaceWithLineage : getPlace;
      const place = await getPlaceRecord(Qualifier.byUuid(uuid));
      if (!place) {
        return serverUtils.error({ status: 404, message: 'Place not found' }, req, res);
      }
      return res.json(place);
    }),

    getAll: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_contacts'] });
      const placeType = Qualifier.byContactType(req.query.type);
      const docs = await getPageByType(placeType, req.query.cursor, req.query.limit);
      return res.json(docs);
    }),

    create: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_create_places', 'can_edit'] });
      const placeDoc = await create(req.body);
      return res.json(placeDoc);
    }),

    update: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_update_places', 'can_edit'] });
      const { params: { uuid }, body } = req;
      const updatePlaceInput = {
        ...body,
        _id: uuid,
      };
      const updatedPlaceDoc = await update(updatePlaceInput);
      return res.json(updatedPlaceDoc);
    })
  }
};
