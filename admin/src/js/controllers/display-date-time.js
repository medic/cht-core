const _ = require('lodash/core');
const moment = require('moment');

angular.module('controllers').controller('DisplayDateTimeCtrl',
  function (
    $log,
    $scope,
    $timeout,
    Settings,
    UpdateSettings,
    translateFilter
  ) {

    'use strict';
    'ngInject';

    const standard_date_formats = [
      'DD-MMM-YYYY',
      'DD/MM/YYYY',
      'MM/DD/YYYY'
    ];

    const standard_datetime_formats = [
      'DD-MMM-YYYY HH:mm:ss',
      'DD/MM/YYYY HH:mm:ss',
      'MM/DD/YYYY HH:mm:ss'
    ];

    $scope.submitAdvancedSettings = function() {
      $scope.status = { loading: true };
      const changes = _.clone($scope.displayDateTimeModel);
      UpdateSettings(changes)
        .then(function() {
          $scope.status = { success: true, msg: translateFilter('Saved') };
          $timeout(function() {
            if ($scope.status) {
              $scope.status.success = false;
            }
          }, 3000);
        })
        .catch(function(err) {
          $log.error('Error updating settings', err);
          $scope.status = { error: true, msg: translateFilter('Error saving settings') };
        });
    };

    $scope.updateDateFormatExample = function() {
      $scope.dateFormatExample = moment()
        .format($scope.displayDateTimeModel.date_format);
    };

    $scope.updateDatetimeFormatExample = function() {
      $scope.datetimeFormatExample = moment()
        .format($scope.displayDateTimeModel.reported_date_format);
    };

    Settings()
      .then(function(res) {
        $scope.displayDateTimeModel = {
          date_format: res.date_format,
          reported_date_format: res.reported_date_format,
        };
        $scope.date_formats = standard_date_formats;
        if (!$scope.date_formats.includes(res.date_format)) {
          $scope.date_formats.push(res.date_format);
        }
        $scope.datetime_formats = standard_datetime_formats;
        if (!$scope.datetime_formats.includes(res.reported_date_format)) {
          $scope.datetime_formats.push(res.reported_date_format);
        }

        $scope.updateDateFormatExample();
        $scope.updateDatetimeFormatExample();
      })
      .catch(function(err) {
        $log.error('Error loading settings', err);
      });

  });
