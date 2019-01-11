/**
 * Service to show a Material Design style snackbar transient notification.
 * Usage: Snackbar('My notification');
 */
angular.module('inboxServices').service('Snackbar',
  function($timeout) {
    'ngInject';
    'use strict';

    var SHOW_DURATION = 5000;
    var ANIMATION_DURATION = 250;
    var hideTimer;

    var show = function(text) {
      $('#snackbar')
        .addClass('active')
        .find('.snackbar-content')
        .text(text);
      hideTimer = $timeout(hide, SHOW_DURATION);
    };

    var hide = function() {
      $timeout.cancel(hideTimer);
      hideTimer = null;
      $('#snackbar').removeClass('active');
    };

    return function(text) {
      if (hideTimer) {
        hide();
        $timeout(function() {
          show(text);
        }, ANIMATION_DURATION);
      } else {
        show(text);
      }
    };
  }
);
