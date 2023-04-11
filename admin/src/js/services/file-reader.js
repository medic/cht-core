angular.module('inboxServices').service('FileReader',
  function($q) {
    'use strict';
    'ngInject';

    const readerThat = (readMethod) => {
      return function(blob) {
        const deferred = $q.defer();
        const reader = new FileReader();
        reader.addEventListener('loadend', function() {
          deferred.resolve(reader.result);
        });
        reader.addEventListener('error', function() {
          deferred.reject(reader.error);
        });
        reader.addEventListener('abort', function() {
          deferred.reject(new Error('FileReader aborted.'));
        });
        reader[readMethod](blob);
        return deferred.promise;
      };
    };

    return {
      base64: readerThat('readAsDataURL'),
      utf8: readerThat('readAsText'),
    };
  }
);
