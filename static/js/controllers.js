var inboxControllers = angular.module('inboxControllers', ['ngSanitize']);

inboxControllers.filter('relativeDate', function () {
  return function (date) {
    if (!date) { 
      return ''; 
    }

    var m = moment(date);

    return '<span title="' + m.format('HH:mm, Do MMM YYYY') + '">' + m.fromNow() + '</span>';
  };
});

inboxControllers.controller('MessageCtrl', ['$scope', 'Message', function ($scope, Message) {
  /*
  $scope.messages = [
    {
      id: '1',
      type: 'form',
      form: 'Prenatal Care',
      time: '3:55pm',
      status: 'incomplete',
      sender: {
        name: 'Smith, Susan',
        role: 'Clinician',
        clinic: 'Ganze Clinic'
      }
    },
    {
      id: '11',
      type: 'message',
      form: 'Message',
      time: '2 Dec 2013',
      status: 'ok',
      sender: {
        name: 'Jones, Susan',
        role: 'Clinician',
        clinic: 'Ganze Clinic'
      }
    },
    {
      id: '2',
      type: 'form',
      form: 'Antenatal Care',
      time: '1:23pm',
      status: 'ok',
      sender: {
        name: 'Smith, Susan',
        role: 'Clinician',
        clinic: 'Ganze Clinic'
      }
    },
    {
      id: '3',
      type: 'form',
      form: 'Stock Monitoring',
      time: '2 Feb 2014',
      status: 'good',
      sender: {
        name: 'Rivers, Joan',
        role: 'Administrator',
        clinic: 'Ganze Clinic'
      }
    },
    {
      id: '10',
      type: 'message',
      form: 'Message',
      time: '2 Dec 2013',
      status: 'ok',
      sender: {
        name: 'Jones, Susan',
        role: 'Clinician',
        clinic: 'Ganze Clinic'
      }
    },
    {
      id: '4',
      type: 'form',
      form: 'Prenatal Care',
      time: '2 Dec 2013',
      status: 'ok',
      sender: {
        name: 'Jones, Susan',
        role: 'Clinician',
        clinic: 'Ganze Clinic'
      }
    },
    {
      id: '5',
      type: 'form',
      form: 'Antenatal Care',
      time: '12 Oct 2013',
      status: 'ok',
      sender: {
        name: 'Smith, Sarah',
        role: 'Clinician',
        clinic: 'Ganze Clinic'
      }
    },
    {
      id: '6',
      type: 'form',
      form: 'Monthly Report',
      time: '2 Oct 2013',
      status: 'good',
      sender: {
        name: 'Rivers, Gareth',
        role: 'Administrator',
        clinic: 'Ganze Clinic'
      }
    },
    {
      id: '7',
      type: 'form',
      form: 'Prenatal Care',
      time: '23 Feb 2013',
      status: 'incomplete',
      sender: {
        name: 'Davidson, Susan',
        role: 'Clinician',
        clinic: 'Ganze Clinic'
      }
    },
    {
      id: '8',
      type: 'form',
      form: 'Antenatal Care',
      time: '22 Feb 2013',
      status: 'good',
      sender: {
        name: 'Smith, Susan',
        role: 'Clinician',
        clinic: 'Ganze Clinic'
      }
    },
    {
      id: '9',
      type: 'form',
      form: 'Stock Monitoring',
      time: '2 Feb 2013',
      status: 'incomplete',
      sender: {
        name: 'Rivers, Joan',
        role: 'Administrator',
        clinic: 'Ganze Clinic'
      }
    }
  ];*/

  $scope.messages = Message.query();
  $scope.forms = [
    {
      code: 'PREN',
      name: 'Prenatal Care'
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