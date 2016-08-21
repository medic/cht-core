var ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;

/**
 * Util functions available to a form doc's `.context` function for checking if
 * a form is relevant to a specific contact.
 */
angular.module('inboxServices').factory('XmlFormsContextUtils', function() {
  'use strict';

  var ageInDays = function(contact) {
    if (!contact.date_of_birth) {
      return;
    }
    var birthday = new Date(contact.date_of_birth);
    var today = new Date();
    var difference = today.getTime() - birthday.getTime();
    return Math.floor(difference / ONE_DAY_IN_MS);
  };

  var ageInMonths = function(contact) {
    if (!contact.date_of_birth) {
      return;
    }
    var birthday = new Date(contact.date_of_birth);
    var today = new Date();
    var years = today.getFullYear() - birthday.getFullYear();
    var months = today.getMonth() - birthday.getMonth();
    var dayModifier = today.getDate() < birthday.getDate() ? -1 : 0;
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
