var phoneNumber = require('phone-number');

angular.module('inboxFilters').filter('phone',
  function(
    Settings
  ) {
    'use strict';
    'ngInject';

    var settings;

    Settings().then(function(result) {
      settings = result;
    });

    var format = function(phone) {
      if (settings) {
        // if valid return the formatted number,
        // if invalid return the given string
        return phoneNumber.format(settings, phone) || phone;
      }
      return phone; // unformatted placeholder
    };

    return function(phone) {
      if (!phone) {
        return;
      }
      var formatted = format(phone);
      return  '<p>' +
                '<a href="tel:' + phone + '" class="mobile-only">' + formatted + '</a>' +
                '<span class="desktop-only">' + formatted + '</span>' +
              '</p>';
    };
  }
);
