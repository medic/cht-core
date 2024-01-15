angular.module('controllers').controller('SmsTestCtrl',
  function(
    $http,
    $log,
    $scope
  ) {

    'use strict';
    'ngInject';

    $scope.message = '';
    $scope.from = '';
    $scope.errors = {};
    $scope.saving = false;
    $scope.success = false;
    $scope.failure = false;

    const validate = () => {
      $scope.errors = {};
      if (!$scope.message) {
        $scope.errors.message = 'validate.required';
      }
      if (!$scope.from) {
        $scope.errors.from = 'validate.required';
      }
      return !$scope.errors.message && !$scope.errors.from;
    };

    const send = () => {
      const body = { message: $scope.message, from: $scope.from };
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      return $http.post('/api/v2/records', $.param(body), { headers: headers });
    };

    $scope.submit = () => {
      $scope.success = false;
      $scope.failure = false;
      if (validate()) {
        $scope.saving = true;
        send()
          .then(() => {
            $scope.success = true;
            $scope.saving = false;
          })
          .catch(err => {
            $scope.failure = true;
            $scope.saving = false;
            $log.error(new Error('Error submitting message'), err);
          });
      }
    };

  });
