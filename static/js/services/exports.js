var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var getMessages = function(DownloadUrl, district) {
    return {
      label: 'Messages',
      url: DownloadUrl({ messages: true, district: district })
    };
  };

  var getReports = function(DownloadUrl, district, forms) {
    return _.map(forms, function(form) {
      return {
        label: form.name,
        url: DownloadUrl({ form: form, district: district })
      };
    });
  };

  inboxServices.factory('Exports', ['DownloadUrl', 'UserDistrict', 'Form',
    function(DownloadUrl, UserDistrict, Form) {
      return function(callback) {
        UserDistrict(function(err, district) {
          if (err) {
            return callback(err);
          }
          Form().then(function(forms) {
            callback(null, {
              messages: getMessages(DownloadUrl, district),
              reports: getReports(DownloadUrl, district, forms)
            });
          }, function(err) {
            return callback(err);
          });
        });
      };
    }
  ]);

}()); 
