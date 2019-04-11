angular.module('inboxDirectives').component('mmMessagesList', {
  templateUrl: 'templates/directives/messages_list.html',
  controller: function($ngRedux, $scope, Selectors) {
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        loadingContent: Selectors.getLoadingContent(state),
        error: Selectors.getMessagesError(state),
        selected: Selectors.getSelected(state)
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

    $scope.$on('$destroy', unsubscribe);
  },
  bindings: {
    loading: '<',
    messages: '<'
  }
});
