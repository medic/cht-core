const DB = require('../db-pouch').medic;

const HORTI_UPGRADE_DOC = 'horti-upgrade';

module.exports = {
  upgrade: (buildInfo, user) => {
    return DB.put({
      _id: HORTI_UPGRADE_DOC,
      user: user,
      created: new Date().getTime(),
      build_info: buildInfo
    });
  }
};
