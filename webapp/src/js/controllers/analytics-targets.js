angular.module('inboxControllers').controller('AnalyticsTargetsCtrl', function (
  $log,
  RulesEngine,
  Telemetry
) {

  'use strict';
  'ngInject';

  const ctrl = this;

  ctrl.targets = [];
  ctrl.loading = true;
  ctrl.targetsDisabled = false;

  const telemetryData = {
    start: Date.now(),
  };

  RulesEngine
    .isEnabled()
    .then(isEnabled => {
      ctrl.targetsDisabled = !isEnabled;
      return isEnabled ? RulesEngine.fetchTargets() : [];
    })
    .catch(err => {
      $log.error('Error getting targets', err);
      return [];
    })
    .then(targets => {
      ctrl.loading = false;
      ctrl.targets = targets.filter(target => target.visible !== false);

      telemetryData.end = Date.now();
      Telemetry.record(`analytics:targets:load`, telemetryData.end - telemetryData.start);
    });
}
);
