var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DownloadUrl', ['BaseUrlService',
    function(BaseUrlService) {
      return function(options) {
        options = options || {};
        var url = BaseUrlService();
        url += '/export/' + (options.messages ? 'messages' : 'forms');
        var params = {
          startkey: [9999999999999,{}],
          endkey: [0],
          tz: options.tz || moment().zone(),
          format: options.format || 'xml',
          reduce: false
        };
        if (options.district) {
            params.startkey.unshift(options.district);
            params.endkey.unshift(options.district);
        }
        params.startkey = JSON.stringify(params.startkey);
        params.endkey = JSON.stringify(params.endkey);
        return url + '?' + $.param(params);
      };
    }
  ]);

}()); 
