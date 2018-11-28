/*
PouchDB intermittently can emit an unhandled rejection to ineffectively communicates that PouchDB has lost control of the IDB database.

DOMException: Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing
*/
angular.module('inboxServices').factory('DatabaseConnectionMonitor',
  function($window) {
    'use strict';
    'ngInject';

    const promiseToCloseDatabase = new Promise(function(resolve) { 
      $window.addEventListener('unhandledrejection', function(promiseRejectionEvent) {
        if (
          promiseRejectionEvent &&
          promiseRejectionEvent.reason &&
          promiseRejectionEvent.reason.message === "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing."
        ) {
          resolve(promiseRejectionEvent);
        }
      })
    });

    return {
      onDatabaseClosed: () => promiseToCloseDatabase,
    };
  }
);
