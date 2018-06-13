angular.module('services').factory('Version',
  function() {

    'use strict';

    var minimumNextRelease = function(version) {
      var minVersion = versionInformation(version) || {};

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
      }
    };

    var compare = function(version1, version2) {
      var parts = ['major', 'minor', 'patch'];
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];

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

    return {
      minimumNextRelease: minimumNextRelease,
      parse: versionInformation,
      compare: compare
    };
  });
