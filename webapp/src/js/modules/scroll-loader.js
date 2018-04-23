(function () {

  'use strict';

  exports.init = function(callback) {
    var _check = function() {
      if (this.scrollHeight - this.scrollTop - 10 < this.clientHeight) {
        callback();
      }
    };
    $('.inbox-items')
      .off('scroll', _check)
      .on('scroll', _check);
  };

}());