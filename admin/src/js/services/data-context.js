const cht = require('@medic/cht-datasource');
const dataContext = cht.getRemoteDataContext();

angular.module('inboxServices').service('DataContext', function(
) {
  'use strict';
  'ngInject';

  return {
    bind: (fn) => dataContext.bind(fn),
    getDataSource: () => cht.getDatasource(dataContext)
  };
});
