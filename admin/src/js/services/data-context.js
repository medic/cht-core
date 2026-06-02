const cht = require('@medic/cht-datasource');
const constants = require('@medic/constants');
const DOC_IDS = constants.DOC_IDS;

angular.module('inboxServices').factory('DataContext', function(
  $log,
  Changes,
  Location,
  Settings
) {
  'use strict';
  'ngInject';

  return Settings().then(initialSettings => {
    let latestSettings = initialSettings;
    Changes({
      key: 'data-context-settings',
      filter: change => change.id === DOC_IDS.SETTINGS,
      callback: () => Settings()
        .then(settings => latestSettings = settings)
        .catch(err => $log.error('Failed to refresh settings', err))
    });

    const settingsService = { getAll: () => latestSettings };
    const dataContext = cht.getRemoteDataContext(settingsService, Location.rootUrl);
    return Object.assign( // NoSONAR
      {},
      dataContext,
      { getDatasource: () => cht.getDatasource(dataContext) }
    );
  });
});
