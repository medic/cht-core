var _ = require('underscore'),
    moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var ENTER_KEY_CODE = 13;

  inboxServices.factory('SearchFilters', ['$translate',
    function($translate) {

      var isEnter = function(e) {
        return e.which === ENTER_KEY_CODE;
      };

      var initFreetext = function(callback) {
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

        var performMobileSearch = function(e) {
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

      var getMultidropdownOptions = function() {
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

      var getMultidropdownResult = function(input) {
        var dropdown = input.multiDropdown();
        return {
          selected: dropdown.val(),
          options: dropdown.options()
        };
      };

      var initFormType = function(callback) {
        getMultidropdownOptions().then(function(options) {
          $('#formTypeDropdown').multiDropdown(options);
          $('#formTypeDropdown').on('update', function() {
            callback(getMultidropdownResult($(this)));
          });
        });
      };

      var initFacility = function(callback) {
        getMultidropdownOptions().then(function(options) {
          $('#facilityDropdown').multiDropdown(options);
          $('#facilityDropdown').on('update', function() {
            callback(getMultidropdownResult($(this)));
          });
        });
      };

      var getTernaryValue = function(positive, negative) {
        if (positive && !negative) {
          return true;
        }
        if (!positive && negative) {
          return false;
        }
      };

      var initStatus = function(callback) {
        $translate.onReady().then(function() {
          $('#statusDropdown').multiDropdown({
            label: function(state, callback) {
              var values = {};
              state.selected.each(function() {
                var elem = $(this);
                values[elem.data('value')] = elem.text();
              });
              var parts = [];
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
            var values = $(this).multiDropdown().val();
            var valid = getTernaryValue(
              _.contains(values, 'valid'),
              _.contains(values, 'invalid')
            );
            var verified = [];
            if(_.contains(values, 'verified')) {
              verified.push(true);
            }
            if(_.contains(values, 'unverified')) {
              verified.push(undefined);
            }
            if(_.contains(values, 'verifiedErrors')) {
              verified.push(false);
            }

            callback({
              valid: valid,
              verified: verified
            });
          });
        });
      };

      var isMobile = function() {
        return $('#mobile-detection').css('display') === 'inline';
      };

      var initDate = function(callback) {
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
          setTimeout(function() {
            if ($('#dateRangeDropdown').is('.disabled')) {
              picker.hide();
            }
          });
        })
        .on('mm.dateSelected.daterangepicker', function(e, picker) {
          if (isMobile()) {
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
        }
      };
    }
  ]);

}());
