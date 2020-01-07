const moment = require('moment');

angular.module('directives').directive('relativeDate', function() {
  'use strict';

  return {
    template: '<span title="{{formattedDate}}">{{relativeDate}}</span>',
    scope: {
      dateFormat: '=',
      date: '=',
    },
    link: function(scope) {
      scope.date = moment(scope.date);
      scope.relativeDate = scope.date.fromNow();
      scope.formattedDate = scope.date.format(scope.dateFormat || 'DD-MMM-YYYY HH:mm:ss');
    }
  };
});
