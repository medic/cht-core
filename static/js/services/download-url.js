var moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var getUrl = function(BaseUrlService, options) {
    var url = [BaseUrlService()];
    url.push('export');
    if (options.messages) {
      url.push('messages');
    } else {
      url.push('forms');
      if (options.form && options.form.code) {
        url.push(options.form.code);
      }
    }
    return url.join('/');
  };

  var getKey = function(options, date) {
    var key = [];

    // valid
    key.push(true);

    // district
    if (options.district) {
      key.push(options.district);
    }

    // form
    key.push(getFormKey(options));

    // date
    key.push(date);

    return JSON.stringify(key);
  };

  var getFormKey = function(options) {
    if (options.messages) {
      return 'null_form';
    }
    if (options.form && options.form.code) {
      return options.form.code;
    }
    return '*';
  };

  inboxServices.factory('DownloadUrl', ['BaseUrlService',
    function(BaseUrlService) {
      return function(options) {
        options = options || {};
        var params = {
          startkey: getKey(options, 9999999999999),
          endkey: getKey(options, 0),
          tz: options.tz || moment().zone(),
          format: options.format || 'xml',
          reduce: false
        };
        return getUrl(BaseUrlService, options) + '?' + $.param(params);
      };
    }
  ]);

}()); 
