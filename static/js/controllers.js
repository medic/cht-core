var inboxControllers = angular.module('inboxControllers', ['ngSanitize']);

// TODO get base url from somewhere
var baseUrl = 'http://localhost:5984/kujua-lite/_design/kujua-lite/_rewrite';

inboxControllers.filter('relativeDate', function () {
  return function (date) {
    if (!date) { 
      return ''; 
    }

    var m = moment(date);

    return '<span title="' + m.format('HH:mm, Do MMM YYYY') + '">' + m.fromNow() + '</span>';
  };
});

inboxControllers.directive('mmSender', function() {
  return {
    restrict: 'E',
    scope: { message: '=' },
    templateUrl: baseUrl + '/static/js/templates/sender.html'
  };
});

inboxControllers.controller('MessageCtrl', ['$scope', 'Message', function ($scope, Message) {
 
  $scope.messages = Message.query();
  $scope.forms = [
    {
      code: 'ANCV',
      name: 'Antenatal Visit'
    },
    {
      code: 'ANCR',
      name: 'Antenatal Care'
    },
    {
      code: 'STCK',
      name: 'Stock Monitoring'
    }
  ];

  $scope.selected = undefined;
  $scope.filterType = 'message';
  $scope.filterForms = [];

  $scope.setMessage = function(id) {
    $scope.messages.forEach(function(message) {
      if (message._id === id) {
        $scope.selected = message;
      }
    });
  };

  $scope.setFilterType = function(filterType) {
    $scope.filterType = filterType;
  };

  $scope.setFilterForms = function(filterForms) {
    $scope.filterForms = filterForms;
  }

  var checkFilterType = function(message) {
    var hasForm = !!message.form;
    if ($scope.filterType === 'message') {
      return !hasForm;
    }
    return hasForm;
  };

  var checkFilterForms = function(message) {
    if ($scope.filterType === 'message') {
      return true;
    }
    if ($scope.filterForms.length === 0) {
      return true;
    }
    for (var i = 0; i < $scope.filterForms.length; i++) {
      if ($scope.filterForms[i].code === message.form) {
        return true;
      }
    }
    return false;
  };

  $scope.checkFilter = function() {
    return function(message) {
      return checkFilterType(message)
          && checkFilterForms(message);
    };
  };

}]);