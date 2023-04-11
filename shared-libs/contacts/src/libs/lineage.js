module.exports = {
  init: function(lineage) {
    Object.assign(module.exports, lineage, { init: this.init });
  },
};
