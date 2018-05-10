angular.module('services').factory('Blob', function() {
  'use strict';

  var blobify = function(str, mime) {
    var blob = new Blob([ str ], { type: mime });
    return (window.URL || window.webkitURL).createObjectURL(blob);
  };

  return {
    json: function(content) {
      return blobify(JSON.stringify(content, null, 4), 'application/json');
    },
    text: function(content) {
      return blobify(content, 'text/plain');
    }
  };

});
