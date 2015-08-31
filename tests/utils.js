module.exports = {
  restore: function() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i].restore) {
        arguments[i].restore();
      }
    }
  }
};
