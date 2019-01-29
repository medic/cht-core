const DB = require('../db').medic;

const HORTI_UPGRADE_DOC = 'horti-upgrade';

module.exports = {
  upgrade: (buildInfo, user, {stageOnly}) => {
    return DB.put({
      _id: HORTI_UPGRADE_DOC,
      schema_version: 1,
      user: user,
      created: new Date().getTime(),
      action: stageOnly ? 'stage' : 'install',
      build_info: buildInfo
    });
  },
  complete: () => {
    return DB.get(HORTI_UPGRADE_DOC)
      .then(upgradeDoc => {
        if (!upgradeDoc.staging_complete) {
          throw {
            code: 404,
            message: 'Cannot find a staged upgrade that is ready for completion'
          };
        }

        upgradeDoc.action = 'complete';

        return DB.put(upgradeDoc);
      });
  }
};
