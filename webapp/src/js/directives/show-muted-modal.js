angular.module('inboxDirectives').directive('showMutedModal', function(
  $parse,
  $state,
  Modal
) {
  'use strict';
  'ngInject';

  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      const goToState = function() {
        const toState = attrs.toState;
        const toStateParams = $parse(attrs.toStateParams)(scope);

        $state.go(toState, toStateParams);
      };

      const hookFn = function(event) {
        event.preventDefault();
        event.stopPropagation();

        if (scope.form.showUnmuteModal) {
          return Modal({
            templateUrl: 'templates/modals/contacts_muted_modal.html',
            controller: 'ContactsMutedModalCtrl',
            controllerAs: 'contactsMutedModalCtrl'
          }).then(function() {
            goToState();
          }).catch(function() {});
        } else {
          goToState();
        }
      };

      element[element.on ? 'on' : 'bind']('click', hookFn);
    }
  };
});
