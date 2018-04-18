angular.module('services').factory('Version',
  function() {

    'use strict';

    var minimumNextRelease = function(version) {
      var minVersion = versionInformation(version);

      if (minVersion.beta !== undefined) {
        ++minVersion.beta;
      } else if (minVersion.patch !== undefined) {
        ++minVersion.patch;
      }

      return minVersion;
    };

    var versionInformation = function(versionString) {
      var versionMatch = versionString &&
          versionString.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-beta\.([0-9]+))?$/);

      if (versionMatch) {
        var version = {
          major: parseInt(versionMatch[1]),
          minor: parseInt(versionMatch[2]),
          patch: parseInt(versionMatch[3])
        };

        if (versionMatch[4] !== undefined) {
          version.beta = parseInt(versionMatch[4]);
        }

        return version;
      } else {
        return {};
      }
    };

    return {
      minimumNextRelease: minimumNextRelease
    };
  });
