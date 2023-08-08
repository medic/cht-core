const db = require('../db');
const environment = require('../environment');

let purgeDb;
let destroyPromise = null;
const get = async () => {
  if (destroyPromise) {
    await destroyPromise;
  }

  if (purgeDb) {
    return purgeDb;
  }

  purgeDb = db.get(`${environment.couchUrl}-purged-cache`);
  return purgeDb;
};

const wipe = async () => {
  if (destroyPromise) {
    return await destroyPromise;
  }

  if (!purgeDb) {
    return;
  }

  destroyPromise = purgeDb.destroy();
  await destroyPromise;
  purgeDb = null;
  destroyPromise = null;
};

module.exports = {
  get,
  wipe,
};
