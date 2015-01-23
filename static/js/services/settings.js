var _ = require('underscore'),
    defaults = require('views/lib/app_settings');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var merge = function(retrieved) {
    var settings = _.defaults(retrieved, defaults);
    if (settings.translations.length !== defaults.translations.length) {
      var keys = _.pluck(settings.translations, 'key');
      _.each(defaults.translations, function(translation) {
        if (!_.contains(keys, translation.key)) {
          settings.translations.push(translation);
        }
      });
    }
    return settings;
  };

  inboxServices.factory('Settings', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return function(callback) {
        $resource(BaseUrlService() + '/app_settings/medic', {}, {
          query: {
            method: 'GET',
            isArray: false,
            cache: true
          }
        }).query(
          function(res) {
            callback(null, merge(res.settings));
          },
          callback
        );
      };
    }
  ]);

}()); 
