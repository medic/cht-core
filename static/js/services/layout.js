/* jshint node: true */
'use strict';

var inboxServices = angular.module('inboxServices');

inboxServices.factory('Layout',
  function() {
    'ngInject';

    var setTitle = function(scope, title) {
      scope.title = title;
    };

    var setActionBar = function(scope, model) {
      scope.actionBar = model;
    };

    var setRightActionBar = function(scope, model) {
      if (!scope.actionBar) {
        scope.actionBar = {};
      }
      scope.actionBar.right = model;
    };

    var setLeftActionBar = function(scope, model) {
      if (!scope.actionBar) {
        scope.actionBar = {};
      }
      scope.actionBar.left = model;
    };

    return {
      setActionBar: setActionBar,
      setLeftActionBar: setLeftActionBar,
      setRightActionBar : setRightActionBar,
      setTitle: setTitle
    };

  });
