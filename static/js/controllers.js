var inboxControllers = angular.module('inboxControllers', ['ngSanitize']);

var baseUrl = $('html').data('base-url');

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

inboxControllers.controller('MessageCtrl', 
  ['$scope', 'Message', 'Facility', 'Settings', 
  function ($scope, Message, Facility, Settings) {
 
  $scope.messages = Message.query();
  $scope.facilities = Facility.query();
  $scope.forms = [];
  $scope.selected = undefined;

  $scope.filterType = 'message';
  $scope.filterForms = [];
  $scope.filterFacilities = [];
  $scope.filterValid = true;
  $scope.filterDate = {
    from: moment().subtract('months', 1).valueOf(),
    to: moment().valueOf()
  }

  Settings.query(function(res) {
    if (res.settings && res.settings.forms) {
      var forms = res.settings.forms;
      for (key in forms) {
        var form = forms[key];
        $scope.forms.push({
          name: form.meta.label.en,
          code: form.meta.code
        });
      }
    }
  });

  $scope.setMessage = function(id) {
    $scope.selected = undefined;
    if (id) {
      $scope.messages.forEach(function(message) {
        if (message._id === id) {
          $scope.selected = message;
        }
      });
    }
  };

  $scope.setFilterType = function(filterType) {
    $scope.filterType = filterType;
  };

  $scope.setFilterForms = function(filterForms) {
    $scope.filterForms = filterForms;
  };

  $scope.setFilterFacilities = function(facilityIds) {
    $scope.filterFacilities = facilityIds;
  };

  $scope.setFilterValid = function(filterValid) {
    $scope.filterValid = filterValid;
  };

  $scope.setFilterDateFrom = function(date) {
    $scope.filterDate.from = date;
  };

  $scope.setFilterDateTo = function(date) {
    $scope.filterDate.to = date;
  };

  var checkFilterType = function(message) {
    var hasForm = !!message.form;
    if ($scope.filterType === 'message') {
      return !hasForm;
    }
    return hasForm;
  };

  var checkFilterValid = function(message) {
    if ($scope.filterType === 'message') {
      return true;
    }
    if ($scope.filterValid === true) {
      return !message.errors.length;
    }
    if ($scope.filterValid === false) {
      return !!message.errors.length;
    }
    return true;
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

  var checkFacility = function(facility, entity) {
    if (!entity) {
      return false;
    }
    if (facility === entity._id) {
      return true;
    }
    if (entity.parent) {
      return checkFacility(facility, entity.parent);
    }
    return false;
  }

  var checkFilterFacilities = function(message) {
    if ($scope.filterFacilities.length === 0) {
      return true;
    }
    for (var i = 0; i < $scope.filterFacilities.length; i++) {
      if (checkFacility(
        $scope.filterFacilities[i], message.related_entities.clinic)
      ) {
        return true;
      }
    }
    return false;
  };

  var checkFilterDate = function(message) {
    return message.reported_date > $scope.filterDate.from 
        && message.reported_date < $scope.filterDate.to;
  };

  $scope.checkFilter = function() {
    return function(message) {
      var show = checkFilterType(message)
              && checkFilterValid(message)
              && checkFilterForms(message)
              && checkFilterDate(message)
              && checkFilterFacilities(message);
      if (!show && $scope.selected && message._id === $scope.selected._id) {
        // hide content if filter doesn't apply to message any more
        $scope.setMessage();
      }
      return show;
    };
  };

}]);