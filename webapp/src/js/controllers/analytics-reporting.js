angular.module('inboxControllers').controller('AnalyticsReportingCtrl',
  function (
    $log,
    $ngRedux,
    $q,
    $scope,
    $state,
    Contacts,
    GlobalActions,
    ScheduledForms,
    Selectors
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        filters: Selectors.getFilters(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      return {
        setFilters: globalActions.setFilters
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    ctrl.setFilters({
      time_unit: 'month',
      quantity: 3
    });

    $q.all([
      ScheduledForms(),
      Contacts([ 'district_hospital' ])
    ])
      .then(function(results) {
        var forms = results[0];
        var districts = results[1];
        ctrl.forms = forms;
        ctrl.districts = districts;
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

    $scope.$on('$destroy', unsubscribe);
  }
);
