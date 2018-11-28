/*
PouchDB intermittently emits an unhandledrejection to ineffectively communicate that it has catastrophically failed.
This service detects the event and resolves a promise when it occurs.

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
          promiseRejectionEvent.reason.message === 'Failed to execute \'transaction\' on \'IDBDatabase\': The database connection is closing.'
        ) {
          resolve(promiseRejectionEvent);
        }
      });
    });

    return {
      onDatabaseClosed: () => promiseToCloseDatabase,
    };
  }
);
