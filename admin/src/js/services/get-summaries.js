const cht = require('@medic/cht-datasource');

angular.module('inboxServices').factory('GetSummaries',
  function(
    $q,
    DataContext
  ) {

    'use strict';
    'ngInject';

    return ids => {
      if (!ids || !ids.length) {
        return $q.resolve([]);
      }
      return DataContext.then(dataContext => {
        const getContactSummaries = dataContext.bind(cht.Contact.v1.getSummaries);
        const getReportSummaries = dataContext.bind(cht.Report.v1.getSummaries);
        return $q.all([getContactSummaries(ids), getReportSummaries(ids)]);
      }).then(([contactSummaries, reportSummaries]) => {
        return [...contactSummaries, ...reportSummaries];
      });
    };
  });
