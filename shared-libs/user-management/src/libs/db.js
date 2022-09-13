module.exports = {
  init: function(db) {
    // Preserve the original medic db object because it gets passed to @medic/lineage
    db.medic = Object.assign(this.medic, db.medic);
    Object.assign(module.exports, db);
  },
  medic: {
    allDocs: () => {},
    get: () => {},
    put: () => {},
    query: () => {}
  },
  medicLogs: {
    get: () => {},
    put: () => {},
  },
  users: {
    get: () => {},
    put: () => {},
  }
};
