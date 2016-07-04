var _ = require('underscore'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditLanguageCtrl',
    function (
      $scope,
      $translate,
      $uibModalInstance,
      DB,
      model
    ) {

      'ngInject';

      var validate = function(model) {
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

      $scope.language = _.clone(model) || {
        enabled: true,
        values: {},
        type: 'translations'
      };

      $scope.submit = function() {
        $scope.errors = validate($scope.language);
        if (!$scope.errors) {
          var pane = modal.start($('#edit-language'));
          if (!$scope.language._id) {
            $scope.language._id = 'messages-' + $scope.language.code;
          }
          DB().put($scope.language)
            .then(function() {
              pane.done();
              $uibModalInstance.close('ok');
            })
            .catch(function(err) {
              $translate('Error saving settings').then(function(message) {
                pane.done(message, err);
              });
            });
        }
      };

      $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
      };
    }
  );

}());