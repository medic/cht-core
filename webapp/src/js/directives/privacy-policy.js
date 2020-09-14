angular.module('inboxDirectives').directive('mmPrivacyPolicy', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/privacy_policy.html',
    controller: 'PrivacyPolicyCtrl',
    controllerAs: 'mmPrivacyPolicyCtrl',
  };
});
