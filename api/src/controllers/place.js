const { Place, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');
const { PermissionError } = require('../errors');

const getPlace = ({ with_lineage }) => ctx.bind(
  with_lineage === 'true'
    ? Place.v1.getWithLineage
    : Place.v1.get
);

const getPageByType = () => ctx.bind(Place.v1.getPage);
const createPlace = () => ctx.bind(Place.v1.create);
const updatePlace = () => ctx.bind(Place.v1.update);

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
      const place = await getPlace(req.query)(Qualifier.byUuid(uuid));
      if (!place) {
        return serverUtils.error({ status: 404, message: 'Place not found' }, req, res);
      }
      return res.json(place);
    }),
    getAll: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);

      const placeType = Qualifier.byContactType(req.query.type);

      const docs = await getPageByType()( placeType, req.query.cursor, req.query.limit );

      return res.json(docs);
    }),
    create: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissionsForEdit(req);

      const place = await createPlace()(req.body);

      return res.json(place);
    }),
    update: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissionsForEdit(req);

      const { uuid } = req.params;
      const place = await updatePlace()({
        ...req.body,
        _id: uuid,
      });

      return res.json(place);
    }),
  }
};
