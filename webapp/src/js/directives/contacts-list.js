angular.module('inboxDirectives').component('mmContactsList', {
  templateUrl: 'templates/partials/contacts_list.html',
  bindings: {
    appending: '<',
    error: '<',
    filtered: '<',
    hasContacts: '<',
    loading: '<',
    moreItems: '<'
  }
});
