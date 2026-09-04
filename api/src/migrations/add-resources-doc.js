const db = require('../db');
const { DOC_IDS } = require('@medic/constants');

module.exports = {
  name: 'add-resources-doc',
  created: new Date(2015, 9, 25, 16, 0, 0, 0),
  run: () => {
    return db.medic.get(DOC_IDS.RESOURCES).catch(err => {
      if (err.status === 404) {
        return db.medic.put({ _id: DOC_IDS.RESOURCES, resources: {} });
      }
      throw err;
    });
  }
};
