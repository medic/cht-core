var ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;

/**
 * Util functions available to a form doc's `.context` function for checking if
 * a form is relevant to a specific contact.
 */
angular.module('inboxServices').factory('XmlFormsContextUtils', function() {
  'use strict';

  var getDateOfBirth = function(contact) {
    if (!contact.date_of_birth) {
      return;
    }
    var dob = new Date(contact.date_of_birth);
    dob.setHours(0);
    dob.setMinutes(0);
    dob.setSeconds(0);
    return dob;
  };

  var ageInDays = function(contact) {
    var dob = getDateOfBirth(contact);
    if (!dob) {
      return;
    }
    var today = new Date();
    var difference = today.getTime() - dob.getTime();
    return Math.floor(difference / ONE_DAY_IN_MS);
  };

  var ageInMonths = function(contact) {
    var dob = getDateOfBirth(contact);
    if (!dob) {
      return;
    }
    var today = new Date();
    var years = today.getFullYear() - dob.getFullYear();
    var months = today.getMonth() - dob.getMonth();
    var dayModifier = today.getDate() < dob.getDate() ? -1 : 0;
    return (years * 12) + months + dayModifier;
  };

  var ageInYears = function(contact) {
    var months = ageInMonths(contact);
    return months && Math.floor(months / 12);
  };

  return {
    ageInDays: ageInDays,
    ageInMonths: ageInMonths,
    ageInYears: ageInYears
  };
});
