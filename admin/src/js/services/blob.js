angular.module('services').factory('Blob', function($window) {
  'use strict';
  'ngInject';

  const blobify = function(str, mime) {
    const blob = new Blob([ str ], { type: mime });
    return ($window.URL || $window.webkitURL).createObjectURL(blob);
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
