const moment = require('moment');

angular
  .module('inboxControllers')
  .controller('EditMessageGroupCtrl', function(
    $scope,
    $uibModalInstance,
    EditGroup,
    Settings
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;

    const getNextHalfHour = function() {
      const time = moment()
        .second(0)
        .millisecond(0);
      if (time.minute() < 30) {
        time.minute(30);
      } else {
        time.minute(0);
        time.add(1, 'hours');
      }
      return time;
    };

    const initDatePickers = function() {
      Settings().then(function(settings) {
        $('#edit-message-group input.datepicker').each(function(index) {
          $(this).daterangepicker(
            {
              startDate: new Date($scope.model.group.rows[index].due),
              singleDatePicker: true,
              timePicker: true,
              applyClass: 'btn-primary',
              cancelClass: 'btn-link',
              parentEl: '#edit-message-group',
              minDate: getNextHalfHour(),
              locale: {
                format: settings.reported_date_format,
              },
            },
            function(date) {
              const i = this.element.closest('fieldset').attr('data-index');
              $scope.model.group.rows[i].due = date.toISOString();
            }
          );
        });
      });
    };

    $uibModalInstance.rendered.then(initDatePickers);

    $scope.$watch('model.group.rows.length', function() {
      initDatePickers();
    });

    ctrl.addTask = function() {
      $scope.model.group.rows.push({
        due: moment().toISOString(),
        added: true,
        group: $scope.model.group.number,
        state: 'scheduled',
        messages: [{ message: '' }],
      });
    };

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };

    ctrl.submit = function() {
      $scope.setProcessing();
      EditGroup($scope.model.report._id, $scope.model.group)
        .then(function() {
          $scope.setFinished();
          $uibModalInstance.close();
        })
        .catch(function(err) {
          $scope.setError(err, 'Error updating group');
        });
    };
  });
