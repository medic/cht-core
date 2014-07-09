
$(function () {

  var getTitle = function(dropdown) {
    var allForms = dropdown.find('[role=menuitem]');
    var selectedForms = dropdown.find('[role=menuitem].selected');
    if (selectedForms.length === 0 || selectedForms.length === allForms.length) {
      return dropdown.data('label-no-filter');
    }
    if (selectedForms.length > 1) {
      return selectedForms.length + ' ' + dropdown.data('filter-label');
    }
    return selectedForms.first().text();
  };

  var updateMultipleSelect = function(dropdown) {
    dropdown.find('.mm-button-text').text(getTitle(dropdown));
  };

  $('.mm-multiple-select').each(function() {
    var select = $(this);
    updateMultipleSelect(select);
    select.on('update', function() {
      updateMultipleSelect($(this));
    });
  });

  $('#formTypeDropdown').on('update', function() {
    var forms = [];
    $(this).find('[role=menuitem].selected').each(function() {
      forms.push($(this).data('form'));
    });
    angular.element($('body')).scope().$apply(function(scope) {
      scope.setFilterForms(forms);
    });
  });

  $('#facilityDropdown').on('update', function() {
    var ids = [];
    $(this).find('[role=menuitem].selected').each(function() {
      ids.push($(this).data('facility-id'));
    });
    angular.element($('body')).scope().$apply(function(scope) {
      scope.setFilterFacilities(ids);
    });
  });

  $('#validDropdown [role=menuitem]').on('click', function() {
    $('#validDropdown .mm-button-text').text($(this).text());
  });

  var blockSelectHide = false;

  $('.mm-multiple-select').on('click', '[role=menuitem]', function(e) {
    var item = $(this);
    item.blur();
    item.toggleClass('selected');
    item.closest('.dropdown').trigger({ type: 'update' });
    updateMultipleSelect(item.closest('.dropdown'));
    blockSelectHide = true;
  });

  $('.mm-multiple-select').on('hide.bs.dropdown', function (e) {
    if (blockSelectHide) {
      e.preventDefault();
      blockSelectHide = false;
    }
  });

  $('#date-from').datepicker().on('changeDate', function(ev) {
    $(this).datepicker('hide');
    angular.element($('body')).scope().$apply(function(scope) {
      scope.setFilterDateFrom(ev.date.getTime());
    });
  });
  $('#date-to').datepicker().on('changeDate', function(ev) {
    $(this).datepicker('hide');
    angular.element($('body')).scope().$apply(function(scope) {
      scope.setFilterDateTo(ev.date.getTime());
    });
  });
  $('#date-from, #date-to').datepicker().on('show', function(ev) {
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
    $('.datepicker').addClass('open');
  });
  $('.datepicker').addClass('dropdown-menu mm-dropdown-menu mm-dropdown-menu-inverse');

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
    $('.row.filters').toggleClass('advanced');
  });

  $('.advanced-filters .btn').on('click', function(e) {
    e.preventDefault();
    _applyFilter();
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
    angular.element($('body')).scope().$apply(function(scope) {
      var url = $('html').data('base-url');
      var type = scope.filterType === 'message' ? 'messages' : 'forms';
      url += '/export/' + type;
      var params = {
        startkey: '["*",9999999999999,{}]',
        endkey: '["*",0]',
        tz: moment().zone(),
        format: 'xml',
        reduce: false
      };
      url += '?' + $.param(params);
      $('#download').attr('href', url);
    });
  });
});

angular.module('inboxApp', ['inboxControllers', 'inboxServices']);