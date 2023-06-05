const purgingConfig = require('../services/purging-config');
const serverUtils = require('../server-utils');
const auth = require('../auth');

module.exports = {
  dryRun: (req, res) => {
    const purgeFn = req.body.fn;
    if (!purgeFn) {
      res.status(400);
      return res.json({
        error: 'bad_request',
        reason: '`fn` parameter is required and must be a valid purge function',
      });
    }

    return auth.check(req, ['can_edit', 'can_configure'])
      .then(() => purgingConfig.dryRun(purgeFn))
      .then(({ wontChangeCount, willPurgeCount, willUnpurgeCount, nextRun }) => {
        return res.json({
          next_run: nextRun,
          wont_change_count: wontChangeCount,
          will_purge_count: willPurgeCount,
          will_unpurge_count: willUnpurgeCount,
        });
      })
      .catch(err => serverUtils.serverError(err, req, res));
  },
};
