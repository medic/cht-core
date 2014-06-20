
$(function () {

  $('.inbox-items').on('click', 'li', function (e) {
    e.preventDefault();
    var elem = $(this);
    if (!elem.is('selected')) {
      var inboxItems = $('.inbox-items');
      inboxItems.find('.selected').removeClass('selected');
      elem.addClass('selected');
      $('body').addClass('show-content');
      $('.slide-back .mm-button').removeClass('mm-button-disabled');
    }
  });

  $('.slide-back').on('click', function (e) {
    e.preventDefault();
    $('.slide-back .mm-button').addClass('mm-button-disabled');
    $('body').removeClass('show-content');
  });

  $('.row.header .tabs').on('click', 'a', function (e) {
    e.preventDefault();
    var elem = $(this);
    if (!elem.is('selected')) {
      $('.row.header .tabs .selected')
        .removeClass('selected')
        .find('.mm-icon')
        .addClass('mm-icon-inverse');
      elem
        .addClass('selected')
        .find('.mm-icon')
        .removeClass('mm-icon-inverse');
    }
  });

  var getForms = function(dropdown, selector) {
    var forms = [];
    dropdown.find(selector).each(function() {
      forms.push($(this).data('form'));
    });
    return forms;
  };

  var getTitle = function(dropdown) {
    var allForms = getForms(dropdown, '[role=menuitem]');
    var selectedForms = getForms(dropdown, '[role=menuitem].selected');
    if (selectedForms.length === 0 || selectedForms.length === allForms.length) {
      return dropdown.data('label-no-filter');
    }
    if (selectedForms.length > 1) {
      return selectedForms.length + ' ' + dropdown.data('filter-label');
    }
    return selectedForms[0].name;
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
    var forms = getForms($(this), '[role=menuitem].selected');
    angular.element($('body')).scope().$apply(function(scope) {
      scope.setFilterForms(forms);
    });
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

  $('#date-from, #date-to')
    .datepicker()
    .on('changeDate', function(ev) {
      $(this).find('.mm-button-text').text(moment(ev.date).format('D MMM YYYY'));
      $(this).datepicker('hide');
    })
    .on('show', function(ev) {
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

});

angular.module('inboxApp', ['inboxControllers', 'inboxServices']);