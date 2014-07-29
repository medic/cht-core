(function () {

  'use strict';

  var module = angular.module('inboxFilters', ['ngSanitize']);

  var getRelativeDate = function(date, format) {
    var m = moment(date);
    return '<span class="relative-date" title="' + m.format(format) + '">' + m.fromNow() + '</span>';
  };

  module.filter('relativeDate', ['RememberService',
    function (RememberService) {
      return function (date) {
        if (!date) { 
          return ''; 
        }
        return getRelativeDate(date, RememberService.dateFormat);
      };
    }
  ]);

  module.filter('state', ['RememberService',
    function (RememberService) {
      return function (task) {
        if (!task || !task.state) {
          return '';
        }
        var date = '';
        if (task.due) {
          date = '<br/>' + getRelativeDate(task.due, RememberService.dateFormat);
        }
        return '<span class="state">' + task.state + '</span>' + date;
      };
    }
  ]);

  module.filter('messageField', ['RememberService',
    function (RememberService) {
      return function (field) {
        if (!field) { 
          return ''; 
        }
        var label = field.label;
        var value = field.value;
        if (['Child Birth Date', 'Expected Date', 'Birth Date'].indexOf(label) !== -1) {
          value = getRelativeDate(value, RememberService.dateFormat);
        }
        return '<label>' + label + '</label><p>' + value + '</p>';
      };
    }
  ]);

  module.filter('messageType', function () {
    return function (message, forms) {
      if (!message || !forms) { 
        return '';
      }
      if (!message.form) {
        return 'Message';
      }
      for (var i = 0; i < forms.length; i++) {
        if (message.form === forms[i].code) {
          return forms[i].name;
        }
      }
      return message.form;
    };
  });

  module.directive('scroller', ['$timeout', 'RememberService', 
    function($timeout, RememberService) {
      return {
        restrict: 'A',
        scope: {},
        link: function(scope, elm) {
          var raw = elm[0];
          
          elm.bind('scroll', function() {
            RememberService.scrollTop = raw.scrollTop;
          });

          $timeout(function() {
            raw.scrollTop = RememberService.scrollTop;
          });
        }
      };
    }
  ]);

  module.directive('mmSender', function() {
    return {
      restrict: 'E',
      scope: { message: '=' },
      templateUrl: '/partials/sender.html'
    };
  });

}());