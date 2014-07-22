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

  $('#validDropdown [role=menuitem]').on('click', function() {
    $('#validDropdown .mm-button-text').text($(this).text());
  });

  $('#date-from').datepicker().on('changeDate', function(ev) {
    $(this).datepicker('hide');
    angular.element($('body')).scope().$apply(function(scope) {
      scope.filterModel.date.from = ev.date.getTime();
    });
  });
  $('#date-to').datepicker().on('changeDate', function(ev) {
    $(this).datepicker('hide');
    angular.element($('body')).scope().$apply(function(scope) {
      scope.filterModel.date.to = ev.date.getTime();
    });
  });
  $('#date-from, #date-to').datepicker().on('show', function(ev) {
    if ($(ev.target).is('.disabled')) {
      $('.datepicker').hide();
      return;
    }
    $('.dropdown.open .dropdown-menu').dropdown('toggle');
    // Change position when rendering in mobile
    if ($('#back').is(':visible')) {
      $('.datepicker').css({
        left: '3em',
        right: '3em',
        top: '9em'
      });
    } else {
      $('.datepicker').css({
        'margin-left': $(this).is('#date-to') ? '-7%' : ''
      });
    }
    $('.datepicker').addClass('open dropdown-menu mm-dropdown-menu mm-dropdown-menu-inverse');
  });

  var iframe = $('#add-record-panel iframe');
  var src = iframe.data('src');
  $.ajax({
    type: 'head',
    url: src,
    success: function() {
      var btn = $('#send-record-button');
      btn.find('.mm-icon').removeClass('mm-icon-disabled');
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

  $('body').on('initialized', function(e, options) {
    angular.element($('body')).scope().$apply(function(scope) {
      scope.userDistrict = options.district;
      scope.init();
    });
  });

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