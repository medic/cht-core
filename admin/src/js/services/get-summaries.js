const cht = require('@medic/cht-datasource');

angular.module('inboxServices').factory('GetSummaries',
  function(
    DataContext
  ) {

    'use strict';
    'ngInject';

    return {
      getContacts: ids => DataContext.then(
        dataContext => dataContext.bind(cht.Contact.v1.getSummaries)(cht.Qualifier.byIds(ids))
      ),
      getReports: ids => DataContext.then(
        dataContext => dataContext.bind(cht.Report.v1.getSummaries)(cht.Qualifier.byIds(ids))
      ),
    };
  });
