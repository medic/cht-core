const calendarInterval = require('@medic/calendar-interval');

(function () {

  'use strict';

  angular.module('inboxServices').factory('CalendarInterval', function() {
    return {
      getCurrent: calendarInterval.getCurrent,
    };
  });
}());
