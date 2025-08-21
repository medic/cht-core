const cht = require('@medic/cht-datasource');

angular.module('inboxServices').service('DataContext', function(
) {
  'use strict';
  'ngInject';

  const dataContext = cht.getRemoteDataContext();
  return Object.assign(
    {},
    dataContext,
    { getDatasource: () => cht.getDatasource(dataContext) }
  );
});
