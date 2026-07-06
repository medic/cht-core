const cht = require('@medic/cht-datasource');

angular.module('inboxServices').factory('GetSummaries',
  function(
    DataContext
  ) {

    'use strict';
    'ngInject';

    const collect = (generator) => {
      const summaries = [];
      const iterate = () => generator.next().then(result => {
        if (result.done) {
          return summaries;
        }
        summaries.push(result.value);
        return iterate();
      });
      return iterate();
    };

    return {
      getContacts: ids => DataContext.then(
        dataContext => collect(dataContext.bind(cht.Contact.v1.getSummaries)(cht.Qualifier.byIds(ids)))
      ),
      getReports: ids => DataContext.then(
        dataContext => collect(dataContext.bind(cht.Report.v1.getSummaries)(cht.Qualifier.byIds(ids)))
      ),
    };
  });
