const cht = require('@medic/cht-datasource');

angular.module('inboxServices').factory('CHTDatasource',
  function(
    Location
  ) {
    'use strict';
    'ngInject';

    const dataContext = cht.getRemoteDataContext(Location.rootUrl);
    const datasource = cht.getDatasource(dataContext);
    return {
      dataContext,
      datasource,
    };
  });
