var readDocs = require('../modules/read-docs');

angular.module('inboxServices').factory('MarkRead', function(
  $q,
  DB
) {

  'use strict';
  'ngInject';

  return function(docs) {
    if (!docs || !docs.length) {
      return $q.resolve();
    }
    var metaDocs = docs.map(function(doc) {
      return { _id: readDocs.id(doc) };
    });
    return DB({ meta: true }).bulkDocs(metaDocs);
  };
});
