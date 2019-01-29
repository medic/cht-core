const db = require('../db');
const RESOURCES_ID = 'resources';

module.exports = {
  name: 'add-resources-doc',
  created: new Date(2015, 9, 25, 16, 0, 0, 0),
  run: () => {
    return db.medic.get(RESOURCES_ID).catch(err => {
      if (err.status === 404) {
        return db.medic.put({ _id: RESOURCES_ID, resources: {} });
      }
      throw err;
    });
  }
};
