/**
 * An API to provide integration with the medic-android app.
 *
 * This service must maintain backwards compatibility as we cannot
 * guarantee the all clients will be on a recent version of the app.
 */
angular.module('inboxServices').factory('AndroidApi',
  function(
    $rootScope,
    $state,
    Session
  ) {

    'use strict';
    'ngInject';

    /**
     * Close all select2 dropdowns
     * @return {boolean} `true` if any select2s were closed.
     */
    var closeSelect2 = function($container) {
      // If there are any select2 dropdowns open, close them.  The select
      // boxes are closed while they are checked - this saves us having to
      // iterate over them twice
      var closed = false;
      $container.find('select.select2-hidden-accessible')
        .each(function() {
          var elem = $(this);
          if (elem.select2('isOpen')) {
            elem.select2('close');
            closed = true;
          }
        });
      return closed;
    };

    /**
     * Close the highest-priority dropdown within a particular container.
     * @return {boolean} `true` if a dropdown was closed; `false` otherwise.
     */
    var closeDropdownsIn = function($container) {
      if (closeSelect2($container)) {
        return true;
      }

      // If there is a dropdown menu open, close it
      var $dropdown = $container.find('.filter.dropdown.open:visible');
      if ($dropdown.length) {
        $dropdown.removeClass('open');
        return true;
      }

      return false;
    };

    /*
     * Find the modal with highest z-index, and ignore the rest
     */
    var closeTopModal = function($modals) {
      var $topModal;
      $modals.each(function() {
        var $modal = $(this);
        if (!$topModal) {
          $topModal = $modal;
          return;
        }
        if ($topModal.css('z-index') <= $modal.css('z-index')) {
          $topModal = $modal;
        }
      });

      if (!closeDropdownsIn($topModal)) {
        // Try to close by clicking modal's top-right `X` or `[ Cancel ]`
        // button.
        $topModal.find('.btn.cancel:visible:not(:disabled),' +
            'button.close:visible:not(:disabled)').click();
      }
    };

    return {
      v1: {

        /**
         * Kill the session.
         */
        logout: function() {
          Session.logout();
        },

        /**
         * Handle hardware back-button presses when inside the android app.
         * @return {boolean} `true` if angular handled the back button; otherwise
         *   the android app will handle it as it sees fit.
         */
        back: function() {
          // If there's a modal open, close any dropdowns inside it, or try to
          // close the modal itself.
          var $modals = $('.modal:visible');
          if ($modals.length) {
            closeTopModal($modals);
            return true;
          }

          // If the hotdog hamburger options menu is open, close it
          var $optionsMenu = $('.dropdown.options.open');
          if($optionsMenu.length) {
            $optionsMenu.removeClass('open');
            return true;
          }

          // If there is an actionbar drop-up menu open, close it
          var $dropup = $('.actions.dropup.open:visible');
          if ($dropup.length) {
            $dropup.removeClass('open');
            return true;
          }

          var body = $('body');

          if (closeDropdownsIn(body)) {
            return true;
          }

          // If at the beginnig of an enketo form, close the content
          if (body.is('.show-content') &&
              body.find('.enketo') &&
              !body.find('.enketo .btn.previous-page:visible:enabled:not(".disablied")').length) {

            $rootScope.$broadcast('HideContent');
            return true;
          }

          // If we're viewing a help page, return to the about page
          if ($state.includes('help')) {
            $state.go('about');
            return true;
          }

          // If we're viewing a tab...
          var primaryTab = $('.header .tabs').find('> a:visible:first');
          if (primaryTab.length) {
            // …but not the primary tab, go to primary tab
            if (!primaryTab.is('.selected')) {
              $state.go(primaryTab.attr('ui-sref'));
              return true;
            }
            // …and it's the primary tab, then hand it over to Android
            return false;
          }

          // Otherwise, just act like a webapp
          window.history.back();
          return true;
        }
      }
    };

  }
);
