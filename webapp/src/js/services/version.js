angular.module('inboxServices').factory('Version',
  function(
    DB
  ) {

    'use strict';
    'ngInject';

    const formatRev = rev => rev.split('-')[0];

    const getDeployVersion = deployInfo => {
      const version = deployInfo && deployInfo.version;
      if (!version) {
        return;
      }
      if (version === deployInfo.base_version || !deployInfo.base_version) {
        return version;
      }
      return `${version} (~${deployInfo.base_version})`;
    };

    return {
      getLocal: () => {
        return DB().get('_design/medic-client').then(ddoc => {
          return {
            version: getDeployVersion(ddoc.deploy_info),
            rev: formatRev(ddoc._rev)
          };
        });
      },
      getRemoteRev: () => {
        // use allDocs because it only downloads the metadata, not the entire doc
        return DB({ remote: true })
          .allDocs({ key: '_design/medic-client' })
          .then(response => formatRev(response.rows[0].value.rev));
      }
    };
  }

);
