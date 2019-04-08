angular.module('inboxDirectives').component('mmContactsList', {
  templateUrl: 'templates/directives/contacts_list.html',
  bindings: {
    appending: '<',
    error: '<',
    filtered: '<',
    hasContacts: '<',
    loading: '<',
    moreItems: '<'
  }
});
