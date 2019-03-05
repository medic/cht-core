angular.module('inboxServices').service('FileReader',
  function($q) {
    'use strict';
    'ngInject';

    return {
      base64: readerThat('readAsDataURL'),
      utf8: readerThat('readAsText'),
    };

    function readerThat(readMethod) {
      return function(blob) {
        return $q((resolve, reject) => {
          var reader = new FileReader();
          reader.addEventListener('loadend', function() {
            resolve(reader.result);
          });
          reader.addEventListener('error', function() {
            reject(reader.error);
          });
          reader.addEventListener('abort', function() {
            reject(new Error('FileReader aborted.'));
          });
          reader[readMethod](blob);
        });
      };
    }
  }
);
