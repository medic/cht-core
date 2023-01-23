angular.module('services').factory('Version',
  function() {

    'use strict';

    const minimumNextRelease = function(version) {
      const minVersion = versionInformation(version) || {};

      if (minVersion.beta !== undefined) {
        ++minVersion.beta;
      } else if (minVersion.patch !== undefined) {
        ++minVersion.patch;
      }

      return minVersion;
    };

    const versionInformation = function(versionString) {
      // TODO: replace this regex with named capture groups once we deprecate node 8
      // /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?<featureRelease>-FR(?:-\w+)+)?(?:-beta\.(?<beta>\d+))?$/
      const versionMatch = versionString &&
          versionString.match(/^(\d+)\.(\d+)\.(\d+)(-FR(?:-\w+)+)?(?:-beta\.(\d+))?(?:-dev\.(\d+))?(\.(\d+))?$/);

      if (versionMatch) {
        const version = {
          major: parseInt(versionMatch[1]),
          minor: parseInt(versionMatch[2]),
          patch: parseInt(versionMatch[3])
        };

        if (versionMatch[5] !== undefined) {
          version.beta = parseInt(versionMatch[5]);
        }

        if (versionMatch[4] !== undefined) {
          version.featureRelease = versionMatch[4].slice(1); // remove leading dash '-'

          if (version.beta) {
            version.featureRelease += '-beta';
          }
        }

        return version;
      }
    };

    const compare = function(version1, version2) {
      const parts = ['major', 'minor', 'patch'];
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (version1[part] !== version2[part]) {
          return version1[part] - version2[part];
        }
      }

      // Because beta is optional, chucking it in the array above means this
      // function could return NaN sometimes, which is weird
      if (version1.beta === undefined && version2.beta === undefined) {
        return 0;
      }

      if (version1.beta === undefined && version2.beta !== undefined) {
        return -1;
      }

      if (version1.beta !== undefined && version2.beta === undefined) {
        return 1;
      }

      return version1.beta - version2.beta;
    };

    const currentVersion = function(currentDeploy) {
      return versionInformation(currentDeploy.base_version || currentDeploy.version);
    };

    return {
      minimumNextRelease: minimumNextRelease,
      parse: versionInformation,
      compare: compare,
      currentVersion: currentVersion
    };
  });
