angular.module('inboxControllers').controller('AnalyticsReportingCtrl',
  function (
    $log,
    $q,
    $scope,
    $state,
    ContactTypes,
    Contacts,
    ScheduledForms
  ) {

    'use strict';
    'ngInject';

    $scope.filters = {
      time_unit: 'month',
      quantity: 3
    };

    const getTopLevelPlaces = () => {
      return ContactTypes.getChildren()
        .then(placeTypes => placeTypes.map(type => type.id))
        .then(typeIds => Contacts(typeIds));
    };

    $q.all([
      ScheduledForms(),
      getTopLevelPlaces()
    ])
      .then(function(results) {
        var forms = results[0];
        var districts = results[1];
        $scope.forms = forms;
        $scope.districts = districts;
        if (!forms.length) {
          throw new Error('No scheduled forms found');
        }
        if (!districts.length) {
          throw new Error('No districts found');
        }
        $state.go(
          'analytics.reporting.detail',
          {
            form: $state.params.form || forms[0].meta.code,
            place: $state.params.place || districts[0]._id
          },
          { location: 'replace' }
        );
      })
      .catch(function(err) {
        $log.error('Error initializing analytics reporting controller', err);
      });

  }
);
