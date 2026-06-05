const cht = require('@medic/cht-datasource');

angular.module('inboxServices').factory('GetSummaries',
  function(
    $q,
    DataContext
  ) {

    'use strict';
    'ngInject';

    const getSummaries = (bindFn, ids) => {
      if (!ids || !ids.length) {
        return $q.resolve([]);
      }
      return DataContext.then(dataContext => {
        const fn = dataContext.bind(bindFn);
        return fn(cht.Qualifier.byUuids(ids));
      });
    };

    return {
      getContacts: ids => getSummaries(cht.Contact.v1.getSummaries, ids),
      getReports: ids => getSummaries(cht.Report.v1.getSummaries, ids),
    };
  });
