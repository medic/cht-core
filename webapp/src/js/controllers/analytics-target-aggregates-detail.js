angular.module('inboxControllers').controller('AnalyticsTargetAggregatesDetailCtrl', function (
  $log,
  $ngRedux,
  $scope,
  $stateParams,
  GlobalActions,
  Selectors,
  TargetAggregates,
  TargetAggregatesActions
) {

  'use strict';
  'ngInject';

  const ctrl = this;
  const mapStateToTarget = (state) => {
    return {
      aggregates: Selectors.getTargetAggregates(state),
      selected: Selectors.getSelectedTargetAggregate(state),
      error: Selectors.getTargetAggregatesError(state),
    };
  };
  const mapDispatchToTarget = function(dispatch) {
    const globalActions = GlobalActions(dispatch);
    const targetActions = TargetAggregatesActions(dispatch);
    return {
      setShowContent: globalActions.setShowContent,
      setTitle: globalActions.setTitle,
      setSelectedTarget: targetActions.setSelectedTarget,
    };
  };
  const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

  if ($stateParams.id) {
    ctrl.setShowContent(true);
    const aggregateDetails = TargetAggregates.getAggregateDetails($stateParams.id, ctrl.aggregates);
    if (aggregateDetails) {
      ctrl.setTitle(aggregateDetails.heading);
      ctrl.setSelectedTarget(aggregateDetails);
    } else {
      $log.error(`Error selecting target: target with id ${$stateParams.id} not found`);
      const err = new Error('Error selecting target: no target found');
      err.translationKey = 'analytics.target.aggregates.error.not.found';
      ctrl.setSelectedTarget({ error: err });
      ctrl.setTitle();
    }
  } else {
    ctrl.setShowContent(false);
    ctrl.setSelectedTarget(null);
    ctrl.setTitle();
  }

  $scope.$on('$destroy', unsubscribe);
});
