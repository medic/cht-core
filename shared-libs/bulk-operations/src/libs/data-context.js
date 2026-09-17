module.exports = {
  init: function(dataContext) {
    Object.assign(module.exports, dataContext, { init: this.init });
  },
};
