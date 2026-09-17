module.exports = {
  init: function(config) {
    Object.assign(module.exports, config, { init: this.init });
  },
};
