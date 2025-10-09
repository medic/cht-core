const service = require('../services/impact');
const serverUtils = require('../server-utils');
const auth = require('../auth');
const { PermissionError } = require('../errors');

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx)) {
    throw new PermissionError('Insufficient privileges');
  }
};
module.exports = {
  getV1: serverUtils.doOrError(async(req, res) => {
    await checkUserPermissions(req); 
    return service.jsonV1()
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  }),
};
