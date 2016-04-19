var _ = require('underscore');

(function () {

  'use strict';

  var FILENAME_REGEX = /filename\=([^;]*)/;

  var getFilename = function(res) {
    var disposition = res.headers('Content-Disposition');
    if (disposition) {
      var match = disposition.match(FILENAME_REGEX);
      if (match) {
        return match[1];
      }
    }
  };

  var getHref = function(res) {
    var data = res.data;
    if (!_.isString(data)) {
      data = JSON.stringify(data);
    }
    var mimetype = res.headers('Content-Type');
    return 'data:' + mimetype + ',' + encodeURIComponent(data);
  };

  /**
   * Prompts the user to download a file given an $http response
   */
  exports.download = function(res) {
    var element = document.createElement('a');
    element.setAttribute('href', getHref(res));
    element.setAttribute('download', getFilename(res));
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

}());
