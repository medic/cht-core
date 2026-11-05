module.exports = {
  init: function(db) {
    Object.assign(module.exports, db, { init: this.init });
  },
};
