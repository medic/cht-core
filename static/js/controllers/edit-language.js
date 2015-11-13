var _ = require('underscore'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var update = function(locales, model, editing) {
    if (editing) {
      var updated = _.findWhere(locales, { code: editing });
      updated.code = model.code;
      updated.name = model.name;
    } else {
      locales.push({
        code: model.code,
        name: model.name
      });
    }
  };

  var validate = function(model, translateFilter) {
    var errors = null;
    if (!model.name) {
      errors = errors || {};
      errors.name = translateFilter('field is required', {
        field: translateFilter('Name')
      });
    }
    if (!model.code) {
      errors = errors || {};
      errors.code = translateFilter('field is required', {
        field: translateFilter('Language code')
      });
    }
    return errors;
  };

  inboxControllers.controller('EditLanguageCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'Settings', 'UpdateSettings',
    function ($scope, $rootScope, translateFilter, Settings, UpdateSettings) {
      $scope.$on('EditLanguageInit', function(e, language) {
        $scope.language = {
          code: language && language.code,
          name: language && language.name
        };
        $scope.editing = language && language.code;
        $scope.errors = {};
      });
      $scope.saveLanguage = function() {
        $scope.errors = validate($scope.language, translateFilter);
        if (!$scope.errors) {
          var pane = modal.start($('#edit-language'));
          Settings()
            .then(function(res) {
              var locales = _.clone(res.locales);
              update(locales, $scope.language, $scope.editing);
              UpdateSettings({ locales: locales }, function(err) {
                if (err) {
                  return pane.done(translateFilter('Error saving settings'), err);
                }
                $scope.language = null;
                $scope.editing = null;
                $scope.errors = {};
                $rootScope.$broadcast('LanguageUpdated', {
                  locales: locales,
                  settings: res
                });
                pane.done();
              });
            })
            .catch(function(err) {
              pane.done(translateFilter('Error retrieving settings'), err);
            });
        }
      };
    }
  ]);

}());