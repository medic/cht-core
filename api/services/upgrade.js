const db = require('../db-pouch');

const HORTI_UPGRADE_DOC = 'horti-upgrade';

module.exports = {
  upgrade: (buildInfo, user) => {
    return db.medic.put({
      _id: HORTI_UPGRADE_DOC,
      user: user,
      created: new Date().getTime(),
      build_info: buildInfo
    });
  }
};
