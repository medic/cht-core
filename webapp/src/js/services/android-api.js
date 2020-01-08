/**
 * An API to provide integration with the medic-android app.
 * 
 * This service must maintain backwards compatibility as we cannot
 * guarantee the all clients will be on a recent version of the app.
 */
angular.module('inboxServices').factory('AndroidApi',
  function(
    $log,
    $state,
    $stateParams,
    $window,
    Feedback,
    MRDT,
    Session,
    Simprints
  ) {

    'use strict';
    'ngInject';

    /**
     * Close all select2 dropdowns
     * @return {boolean} `true` if any select2s were closed.
     */
    const closeSelect2 = function($container) {
      // If there are any select2 dropdowns open, close them.  The select
      // boxes are closed while they are checked - this saves us having to
      // iterate over them twice
      let closed = false;
      $container.find('select.select2-hidden-accessible')
        .each(function() {
          const elem = $(this);
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
    const closeDropdownsIn = function($container) {
      if (closeSelect2($container)) {
        return true;
      }

      // If there is a dropdown menu open, close it
      const $dropdown = $container.find('.filter.dropdown.open:visible');
      if ($dropdown.length) {
        $dropdown.removeClass('open');
        return true;
      }

      // On an Enketo form, go to the previous page (if there is one)
      if ($container.find('.enketo .btn.previous-page:visible:enabled:not(".disabled")').length) {
        $window.history.back();
        return true;
      }

      return false;
    };

    /*
     * Find the modal with highest z-index, and ignore the rest
     */
    const closeTopModal = function($modals) {
      let $topModal;
      $modals.each(function() {
        const $modal = $(this);
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
          const $modals = $('.modal:visible');
          if ($modals.length) {
            closeTopModal($modals);
            return true;
          }

          // If the hotdog hamburger options menu is open, close it
          const $optionsMenu = $('.dropdown.options.open');
          if($optionsMenu.length) {
            $optionsMenu.removeClass('open');
            return true;
          }

          // If there is an actionbar drop-up menu open, close it
          const $dropup = $('.actions.dropup.open:visible');
          if ($dropup.length) {
            $dropup.removeClass('open');
            return true;
          }

          if (closeDropdownsIn($('body'))) {
            return true;
          }

          if ($state.current.name === 'contacts.deceased') {
            $state.go('contacts.detail', { id: $stateParams.id });
            return true;
          }

          if ($stateParams.id) {
            $state.go($state.current.name, { id: null }, { reload: true });
            return true;
          }

          // If we're viewing a tab, but not the primary tab, go to primary tab
          const primaryTab = $('.header .tabs').find('> a:visible:first');
          if (!primaryTab.is('.selected')) {
            const uiSref = primaryTab.attr('ui-sref');
            if (uiSref) {
              $state.go(uiSref);
              return true;
            } else {
              const message = 'Attempt to back to an undefined state [AndroidApi.back()]';  
              Feedback.submit(message).catch(err => {
                $log.error('Error saving feedback', err);
              });
            }
          }

          return false;
        },

        /**
         * Handle the response from the MRDT app
         * @param response The stringified JSON response from the MRDT app.
         */
        mrdtResponse: function(response) {
          try {
            MRDT.respond(JSON.parse(response));
          } catch(e) {
            return $log.error(
              new Error(`Unable to parse JSON response from android app: "${response}", error message: "${e.message}"`)
            );
          }
        },

        /**
         * Handle the response from the MRDT app
         * @param response The stringified JSON response from the MRDT app.
         */
        mrdtTimeTakenResponse: function(response) {
          try {
            MRDT.respondTimeTaken(JSON.parse(response));
          } catch(e) {
            return $log.error(
              new Error(`Unable to parse JSON response from android app: "${response}", error message: "${e.message}"`)
            );
          }
        },

        /**
         * Handle the response from the simprints device
         *
         * @param requestType Indicates the response handler to call. Either 'identify' or 'register'.
         * @param requestIdString The unique ID of the request to the simprints device.
         * @param response The stringified JSON response from the simprints device.
         */
        simprintsResponse: function(requestType, requestIdString, response) {
          const requestId = parseInt(requestIdString, 10);
          if (isNaN(requestId)) {
            return $log.error(new Error('Unable to parse requestId: "' + requestIdString + '"'));
          }
          try {
            response = JSON.parse(response);
          } catch(e) {
            return $log.error(new Error('Unable to parse JSON response from android app: "' + response + '"'));
          }
          if (requestType === 'identify') {
            Simprints.identifyResponse(requestId, response);
          } else if (requestType === 'register') {
            Simprints.registerResponse(requestId, response);
          } else {
            return $log.error(new Error('Unknown request type: "' + requestType + '"'));
          }
        },

        smsStatusUpdate: function(id, destination, content, status, detail) {
          // prettier-ignore
          $log.debug('smsStatusUpdate() :: ' +
              ' id=' + id +
              ', destination=' + destination +
              ', content=' + content +
              ', status=' + status +
              ', detail=' + detail);
          // TODO storing status updates for SMS should be implemented as part of #4812
        },
      }
    };

  }
);
