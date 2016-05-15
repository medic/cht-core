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

  var validate = function(model, $translate) {
    var errors = null;
    if (!model.name) {
      errors = errors || {};
      errors.name = $translate.instant('field is required', {
        field: $translate.instant('Name')
      });
    }
    if (!model.code) {
      errors = errors || {};
      errors.code = $translate.instant('field is required', {
        field: $translate.instant('Language code')
      });
    }
    return errors;
  };

  inboxControllers.controller('EditLanguageCtrl',
    function (
      $rootScope,
      $scope,
      $translate,
      Settings,
      UpdateSettings
    ) {

      'ngInject';

      $scope.$on('EditLanguageInit', function(e, language) {
        $scope.language = {
          code: language && language.code,
          name: language && language.name
        };
        $scope.editing = language && language.code;
        $scope.errors = {};
      });
      $scope.saveLanguage = function() {
        $scope.errors = validate($scope.language, $translate);
        if (!$scope.errors) {
          var pane = modal.start($('#edit-language'));
          Settings()
            .then(function(settings) {
              var locales = _.clone(settings.locales);
              update(locales, $scope.language, $scope.editing);
              UpdateSettings({ locales: locales }, function(err) {
                if (err) {
                  $translate('Error saving settings').then(function(message) {
                    pane.done(message, err);
                  });
                  return;
                }
                $scope.language = null;
                $scope.editing = null;
                $scope.errors = {};
                $rootScope.$broadcast('LanguageUpdated', {
                  locales: locales,
                  settings: settings
                });
                pane.done();
              });
            })
            .catch(function(err) {
              $translate('Error retrieving settings').then(function(message) {
                pane.done(message, err);
              });
            });
        }
      };
    }
  );

}());