const db = require('../db');
const DDOCS_TO_REMOVE = ['_design/kujua-sentinel', '_design/erlang_filters'];

const remove = id => {
  return db.medic.get(id)
    .then(ddoc => {
      ddoc._deleted = true;
      return db.medic.put(ddoc);
    })
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }
    });
};

module.exports = {
  name: 'remove-obsolete-ddocs',
  created: new Date(2016, 8, 2, 22, 0, 0, 0),
  run: () => Promise.all(DDOCS_TO_REMOVE.map(remove))
};
