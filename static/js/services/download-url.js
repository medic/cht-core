var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DownloadUrl', ['BaseUrlService',
    function(BaseUrlService) {
      return function(type) {
        var url = BaseUrlService();
        url += '/export/' + (type === 'messages' ? 'messages' : 'forms');
        url += '?' + $.param({
          startkey: '[9999999999999,{}]',
          endkey: '[0]',
          tz: moment().zone(),
          format: 'xml',
          reduce: false
        });
        return url;
      };
    }
  ]);
  
}()); 
