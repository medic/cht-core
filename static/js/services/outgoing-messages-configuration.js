(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('OutgoingMessagesConfiguration',
    ['translateFilter', 
    function(translateFilter) {

      var mapGroupModel = function(translations, path, labelParts) {
        return {
          label: labelParts.join(' › '),
          translations: _.map(translations, function(translation, index) {
            return {
              path: path + '[' + index + ']',
              translations: translation.message
            };
          })
        };
      };

      var createReportModel = function(groupModels, report, path, labelParts) {
        groupModels.push(mapGroupModel(
          report.messages,
          path + '.messages',
          labelParts.concat([translateFilter('Messages')])
        ));
        if (report.validations) {
          groupModels.push(mapGroupModel(
            report.validations.list,
            path + '.validations.list',
            labelParts.concat([translateFilter('Validations')])
          ));
        }
      };

      var createReportsModel = function(groupModels, settings, groupCode, groupLabel) {
        var group = settings[groupCode];
        if (group) {
          group.forEach(function(report, index) {
            createReportModel(
              groupModels,
              report,
              groupCode + '[' + index + ']',
              [ groupLabel, report.name || report.form ]
            );
          });
        }
      };

      return function(settings) {
        var groupModels = [];

        // arrays of configurations
        createReportsModel(
          groupModels,
          settings,
          'registrations',
          translateFilter('Registrations')
        );
        createReportsModel(
          groupModels,
          settings,
          'schedules',
          translateFilter('Schedules')
        );
        createReportsModel(
          groupModels,
          settings,
          'patient_reports',
          translateFilter('Patient Report')
        );

        // single configurations
        if (settings.notifications) {
          createReportModel(
            groupModels,
            settings.notifications,
            'notifications',
            [ translateFilter('Notifications') ]
          );
        }

        return groupModels;
      };

    }
  ]);

}()); 
