angular.module('inboxControllers').controller('AnalyticsTargetAggregatesDetailCtrl', function (
  $log,
  $ngRedux,
  $scope,
  $stateParams,
  $translate,
  GlobalActions,
  Selectors,
  TargetAggregates,
  TargetAggregatesActions,
  TranslateFrom
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
      setError: targetActions.setError,
    };
  };
  const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

  if ($stateParams.id) {
    ctrl.setShowContent(true);
    const aggregateDetails = TargetAggregates.getAggregateDetails($stateParams.id, ctrl.aggregates);
    if (aggregateDetails) {
      const title = aggregateDetails.translation_key ?
        $translate.instant(aggregateDetails.translation_key) : TranslateFrom(aggregateDetails.title);
      ctrl.setTitle(title);
      ctrl.setSelectedTarget(aggregateDetails);
      ctrl.setError(null);
    } else {
      $log.error(`Error selecting target: target with id ${$stateParams.id} not found`);
      const err = new Error('Error selecting target: no target found');
      err.translationKey = 'analytics.target.aggreagates.error.not.found';
      ctrl.setError(err);
      ctrl.setSelectedTarget(null);
    }
  } else {
    ctrl.setShowContent(false);
    ctrl.setSelectedTarget(null);
  }

  $scope.$on('$destroy', unsubscribe);
});
