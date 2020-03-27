const moment = require('moment');

/**
 * Util functions available to a form doc's `.context` function for checking if
 * a form is relevant to a specific contact.
 */
angular.module('inboxServices').factory('XmlFormsContextUtils', function() {
  'use strict';

  const getDateDiff = function(contact, unit) {
    if (!contact.date_of_birth) {
      return;
    }
    const dob = moment(contact.date_of_birth).startOf('day');
    return moment().diff(dob, unit);
  };

  return {
    ageInDays: function(contact) {
      return getDateDiff(contact, 'days');
    },
    ageInMonths: function(contact) {
      return getDateDiff(contact, 'months');
    },
    ageInYears: function(contact) {
      return getDateDiff(contact, 'years');
    }
  };
});
