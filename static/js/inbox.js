$(function () {

  'use strict';

  $('#formTypeDropdown').on('update', function() {
    var forms = $(this).multiDropdown().val();
    angular.element($('body')).scope().$apply(function(scope) {
      scope.filterModel.forms = forms;
    });
  });

  $('#facilityDropdown').on('update', function() {
    var ids = $(this).multiDropdown().val();
    angular.element($('body')).scope().$apply(function(scope) {
      scope.filterModel.facilities = ids;
    });
  });

  $('#date-filter').daterangepicker({
    startDate: moment($('#date-filter').data('start')),
    endDate: moment($('#date-filter').data('end')),
    maxDate: moment(),
    applyClass: 'btn-primary',
    cancelClass: 'btn-link'
  },
  function(start, end) {
    angular.element($('body')).scope().$apply(function(scope) {
      scope.filterModel.date.from = start.valueOf();
      scope.filterModel.date.to = end.valueOf();
    });
  })
  .on('dateSelected.daterangepicker', function(e, picker) {
    if ($('#back').is(':visible')) {
      // mobile version - only show one calendar at a time
      if (picker.container.is('.show-from')) {
        picker.container.removeClass('show-from').addClass('show-to');
      } else {
        picker.container.removeClass('show-to').addClass('show-from');
        picker.hide();
      }
    }
  })
  .on('show.daterangepicker', function(e, picker) {
    if (picker.element.is('.disabled')) {
      picker.hide();
    }
  });
  $('.daterangepicker').addClass('mm-dropdown-menu show-from');

  var iframe = $('#add-record-panel iframe');
  var src = iframe.data('src');
  $.ajax({
    type: 'head',
    url: src,
    success: function() {
      var btn = $('#send-record-button');
      btn.closest('li').removeClass('disabled');
      btn.on('click', function(e) {
        e.preventDefault();
        $('#add-record-panel .dropdown-menu').toggle();
        if (!iframe.attr('src')) {
          iframe.attr('src', src);
        }
      });
    }
  });

  $('body').on('click', '.send-message', function(e) {
    e.preventDefault();
    var val = [];
    var to = $(e.target).closest('.send-message').attr('data-send-to');
    if (to) {
      val.push(to);
    }
    $('#send-message [name=phone]').select2('val', val);
    $('#send-message [name=message]').val('');
    $('#send-message').modal('show');
  });

  $('#update-facility-btn').on('click', function(e) {
    e.preventDefault();
    angular.element($('body')).scope().$apply(function(scope) {
      var val = '';
      if (scope.selected && 
        scope.selected.related_entities && 
        scope.selected.related_entities.clinic) {
        val = scope.selected.related_entities.clinic._id;
      }
      $('#update-facility [name=facility]').select2('val', val);
    });
    $('#update-facility').modal('show');
  });
  $('#update-facility [name=facility]').select2();

  var _applyFilter = function(options) {
    options = options || {};
    angular.element($('body')).scope().$apply(function(scope) {
      if (options.updateFilter) {
        scope.filter(options);
      } else {
        scope.advancedFilter(options);
      }
    });
  };
  _applyFilter({updateFilter: true});

  $(document).on('data-record-updated', function(e, data) {
    _applyFilter({ 
      silent: true, 
      changes: data
    });
  });

  $('#toggle-filters').on('click', function(e) {
    e.preventDefault();
    if ($('#toggle-filters').find('.mm-icon.mm-icon-disabled').length) {
      return;
    }
    $('.row.filters').toggleClass('advanced');
  });

  $('.advanced-filters .btn').on('click', function(e) {
    e.preventDefault();
    _applyFilter();
  });

  $('body').on('dataRecordsInitialized', function(e, options) {
    angular.element($('body')).scope().$apply(function(scope) {
      scope.init(options);
    });
  });
  // Notify data_records.js that inbox is ready
  $('body').trigger('inboxInitialized');

  $('#advanced').on('keypress', function(e) {
    if (e.which === 13) {
      _applyFilter();
    }
  });

  var itemPanel = $('.inbox-items');
  itemPanel.on('scroll', function () {
    if (this.scrollHeight - this.scrollTop - 10 < this.clientHeight) {
      _applyFilter({
        silent: true,
        skip: true
      });
    }
  });

  $('#download').on('click', function(e) {
    if ($('#download').find('.mm-button.disabled').length) {
      e.preventDefault();
      return;
    }
    angular.element($('body')).scope().$apply(function(scope) {
      var url = $('html').data('base-url');
      var type = scope.filterModel.type === 'message' ? 'messages' : 'forms';
      url += '/export/' + type;
      var params = {
        startkey: '[9999999999999,{}]',
        endkey: '[0]',
        tz: moment().zone(),
        format: 'xml',
        reduce: false
      };
      url += '?' + $.param(params);
      $('#download').attr('href', url);
    });
  });

});