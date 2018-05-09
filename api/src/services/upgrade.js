const DB = require('../db-pouch').medic;

const HORTI_UPGRADE_DOC = 'horti-upgrade';

module.exports = {
  upgrade: (buildInfo, user, {stageOnly}) => {
    return DB.put({
      _id: HORTI_UPGRADE_DOC,
      user: user,
      created: new Date().getTime(),
      action: stageOnly ? 'stage' : 'install',
      build_info: buildInfo
    });
  },
  complete: () => {
    return DB.get(HORTI_UPGRADE_DOC)
      .then(upgradeDoc => {
        if (!upgradeDoc.stagingComplete) {
          throw {
            code: 404,
          };
        }

        upgradeDoc.action = 'complete';

        return DB.put(upgradeDoc);
      });
  }
};
