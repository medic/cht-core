angular.module('inboxServices').service('SessionStorage', function(
  store
) {

  'use strict';
  'ngInject';

  return store.getNamespacedStore('medic.session', 'sessionStorage');
});
