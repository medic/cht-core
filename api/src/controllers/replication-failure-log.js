const auth = require('../auth');
const serverUtils = require('../server-utils');
const moment = require('moment');
const replicationFailureLog = require('../services/replication/replication-failure-log');

module.exports = {
  get: async (req, res) => {
    try {
      const userCtx = await auth.getUserCtx(req);
      if (!auth.isDbAdmin(userCtx)) {
        throw { code: 401, message: 'User is not an admin' };
      }

      const month = req.query.month || moment().format('YYYY-MM');
      const logs = await replicationFailureLog.getByMonth(month);
      res.json({ month, logs });
    } catch (err) {
      serverUtils.error(err, req, res, true);
    }
  }
};
