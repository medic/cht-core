var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DownloadUrl', ['BaseUrlService',
    function(BaseUrlService) {
      return function(messages) {
        var url = BaseUrlService();
        url += '/export/' + (messages ? 'messages' : 'forms');
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
