const medicOfflineFreetext = require('./medic-offline-freetext');

const getRev = async (db, id) => db
  .get(id)
  .then(({ _rev }) => _rev)
  .catch((e) => {
    if (e.status === 404) {
      return undefined;
    }
    throw e;
  });

const initDdoc = async (db, ddoc) => db.put({
  ...ddoc,
  _rev: await getRev(db, ddoc._id),
});

const init = async (db) => initDdoc(db, medicOfflineFreetext);

module.exports = {
  init
};
