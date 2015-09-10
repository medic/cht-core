angular.module('inboxServices').service('FileReader', [
  '$q',
  function($q) {
    return function(blob) {
      var deferred = $q.defer();
      var reader = new FileReader();
      reader.addEventListener('loadend', function() {
        deferred.resolve(reader.result);
      });
      reader.addEventListener('error', function() {
        deferred.reject(reader.error);
      });
      reader.addEventListener('abort', function() {
        deferred.reject(new Error('FileReader aborted.'));
      });
      reader.readAsText(blob);
      return deferred.promise;
    };
  }
]);