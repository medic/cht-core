const { Place, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');

const getPlace = ({ with_lineage }) => ctx.bind(
  with_lineage === 'true'
    ? Place.v1.getWithLineage
    : Place.v1.get
);

module.exports = {
  v1: {
    get: serverUtils.doOrError(async (req, res) => {
      const userCtx = await auth.getUserCtx(req);
      if (!auth.isOnlineOnly(userCtx) || !auth.hasAllPermissions(userCtx, 'can_view_contacts')) {
        return Promise.reject({ code: 403, message: 'Insufficient privileges' });
      }
      const { uuid } = req.params;
      const place = await getPlace(req.query)(Qualifier.byUuid(uuid));
      if (!place) {
        return serverUtils.error({ status: 404, message: 'Place not found' }, req, res);
      }
      return res.json(place);
    })
  }
};
