const moment = require('moment');
const responsive = require('../modules/responsive');

(function () {

  'use strict';

  const ENTER_KEY_CODE = 13;

  angular.module('inboxServices').factory('SearchFilters',
    function(
      $timeout,
      $translate
    ) {
      'ngInject';

      const isEnter = function(e) {
        return e.which === ENTER_KEY_CODE;
      };

      const initFreetext = function(callback) {
        $('#search').on('click', function(e) {
          e.preventDefault();
          callback();
        });
        $('#freetext').on('keypress', function(e) {
          if (isEnter(e)) {
            e.preventDefault();
            callback();
          }
        });

        const performMobileSearch = function(e) {
          e.preventDefault();
          $(e.target).closest('.filter').removeClass('open');
          callback();
        };
        $('#mobile-search-go').on('click', performMobileSearch);
        $('#mobile-freetext').on('keypress', function(e) {
          if (isEnter(e)) {
            performMobileSearch(e);
          }
        });
        $('.mobile-freetext-filter').on('shown.bs.dropdown', function() {
          $('#mobile-freetext').focus();
        });

        // stop bootstrap closing the search pane on click
        $('.filters .mobile-freetext-filter .search-pane').on('click', function(e) {
          e.stopPropagation();
        });
      };

      const getMultidropdownOptions = function() {
        return $translate.onReady().then(function() {
          return {
            label: function(state, callback) {
              if (state.selected.length === 0 || state.selected.length === state.total.length) {
                return callback($translate.instant(state.menu.data('label-no-filter')));
              }
              if (state.selected.length === 1) {
                return callback(state.selected.first().text());
              }
              callback($translate.instant(
                state.menu.data('filter-label'), { number: state.selected.length }
              ));
            },
            selectAllLabel: $translate.instant('select all'),
            clearLabel: $translate.instant('clear')
          };
        });
      };

      const getMultidropdownResult = function(input) {
        const dropdown = input.multiDropdown();
        return {
          selected: dropdown.val(),
          options: dropdown.options()
        };
      };

      const initFormType = function(callback) {
        getMultidropdownOptions().then(function(options) {
          $('#formTypeDropdown').multiDropdown(options);
          $('#formTypeDropdown').on('update', function() {
            callback(getMultidropdownResult($(this)));
          });
        });
      };

      const initFacility = function(callback) {
        getMultidropdownOptions().then(function(options) {
          $('#facilityDropdown').multiDropdown(options);
          $('#facilityDropdown').on('update', function() {
            callback(getMultidropdownResult($(this)));
          });
        });
      };

      const getTernaryValue = function(positive, negative) {
        if (positive && !negative) {
          return true;
        }
        if (!positive && negative) {
          return false;
        }
      };

      const initStatus = function(callback) {
        $translate.onReady().then(function() {
          $('#statusDropdown').multiDropdown({
            label: function(state, callback) {
              const values = {};
              state.selected.each(function() {
                const elem = $(this);
                values[elem.data('value')] = elem.text();
              });
              let parts = [];
              if(values.unverified) {
                parts.push(values.unverified);
              }
              if(values.verifiedErrors) {
                parts.push(values.verifiedErrors);
              }
              if(values.verified) {
                parts.push(values.verified);
              }
              if(values.unverified && values.verifiedErrors && values.verified) {
                parts = [];
              }

              if (values.valid && !values.invalid) {
                parts.push(values.valid);
              } else if (!values.valid && values.invalid) {
                parts.push(values.invalid);
              }
              if (parts.length === 0 || parts.length === state.total.length) {
                return callback($translate.instant(state.menu.data('label-no-filter')));
              }
              return callback(parts.join(', '));
            },
            selectAllLabel: $translate.instant('select all'),
            clearLabel: $translate.instant('clear')
          });
          $('#statusDropdown').on('update', function() {
            const values = $(this).multiDropdown().val();
            const valid = getTernaryValue(
              values.includes('valid'),
              values.includes('invalid')
            );
            const verified = [];
            if(values.includes('verified')) {
              verified.push(true);
            }
            if(values.includes('unverified')) {
              verified.push(undefined);
            }
            if(values.includes('verifiedErrors')) {
              verified.push(false);
            }

            callback({
              valid: valid,
              verified: verified
            });
          });
        });
      };

      const initDate = function(callback) {
        $('#date-filter').daterangepicker({
          startDate: moment().subtract(1, 'months'),
          endDate: moment(),
          maxDate: moment(),
          opens: 'center',
          autoApply: true,
          locale: {
            daysOfWeek: moment.weekdaysMin(),
            monthNames: moment.monthsShort(),
            firstDay: moment.localeData()._week.dow
          }
        },
        function(start, end) {
          callback({
            from: start.valueOf(),
            to: end.valueOf()
          });
        })
          .on('show.daterangepicker', function(e, picker) {
            $timeout(function() {
              if ($('#dateRangeDropdown').is('.disabled')) {
                picker.hide();
              }
            });
          })
          .on('mm.dateSelected.daterangepicker', function(e, picker) {
            if (responsive.isMobile()) {
            // mobile version - only show one calendar at a time
              if (picker.container.is('.show-from')) {
                picker.container.removeClass('show-from').addClass('show-to');
              } else {
                picker.container.removeClass('show-to').addClass('show-from');
              }
            }
          });
        $('.daterangepicker').addClass('filter-daterangepicker mm-dropdown-menu show-from');
      };

      return {
        freetext: initFreetext,
        formType: initFormType,
        status: initStatus,
        date: initDate,
        facility: initFacility,
        reset: function() {
          $('.filter.multidropdown:not(.no-reset)').each(function() {
            $(this).multiDropdown().reset();
          });
        },
        destroy: function() {
          $('#date-filter').data('daterangepicker').remove();
        }
      };
    }
  );

}());
