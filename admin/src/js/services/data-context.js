const cht = require('@medic/cht-datasource');

angular.module('inboxServices').factory('DataContext', function(
  Location
) {
  'use strict';
  'ngInject';

  const dataContext = cht.getRemoteDataContext(Location.rootUrl);
  return Object.assign( // NoSONAR
    {},
    dataContext,
    { getDatasource: () => cht.getDatasource(dataContext) }
  );
});
