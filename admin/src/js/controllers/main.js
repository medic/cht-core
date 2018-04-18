angular.module('controllers').controller('MainCtrl', function($translate) {
  'ngInject';
  $translate.use('en');
  console.log('in main controller');
});
