(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('XmlForms', [
    '$q', 'DB',
    function($q, DB) {
      return function() {
        return DB.get()
          .query('medic/forms', { include_docs: true })
          .then(function(res) {
            var forms = res.rows.filter(function(row) {
              return row.doc._attachments.xml;
            }).map(function(row) {
              return row.doc;
            });
            return $q.resolve(forms);
          });
      };
    }
  ]);

}());