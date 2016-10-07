/* jshint node: true */
'use strict';

var inboxServices = angular.module('inboxServices');

inboxServices.factory('Layout',
  function() {
    'ngInject';

    var setTitle = function(scope, title) {
      scope.title = title;
    };

    return {
      setTitle: setTitle
    };

  });
