/**
 * Service to show a Material Design style snackbar transient notification.
 * Usage: Snackbar('My notification');
 */
angular.module('inboxServices').service('Snackbar',
  function($timeout) {
    'ngInject';
    'use strict';

    const SHOW_DURATION = 5000;
    const ANIMATION_DURATION = 250;
    let hideTimer;

    const show = function(text) {
      $('#snackbar')
        .addClass('active')
        .find('.snackbar-content')
        .text(text);
      hideTimer = $timeout(hide, SHOW_DURATION);
    };

    const hide = function() {
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
