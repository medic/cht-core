angular.module('inboxDirectives').component('mmContactsList', {
  templateUrl: 'templates/directives/contacts_list.html',
  controllerAs: 'contactsListCtrl',
  bindings: {
    appending: '<',
    error: '<',
    filtered: '<',
    hasContacts: '<',
    loading: '<',
    moreItems: '<'
  }
});
