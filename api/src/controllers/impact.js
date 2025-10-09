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
  v1: {
    get: serverUtils.doOrError(async(req, res) => {
      await checkUserPermissions(req);
      try {
        const impact= await service.jsonV1();
        res.json(impact);
      } catch(err){
        serverUtils.error(err, req, res);
      }      
    })
  }
};
