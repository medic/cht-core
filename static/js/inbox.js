var db = require('db').current(),
    _ = require('underscore'),
    session = require('session');

require('../dist/reporting-views');
require('./app');

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

  $('#messageTypeDropdown').on('update', function() {
    var types = $(this).multiDropdown().val();
    angular.element($('body')).scope().$apply(function(scope) {
      scope.filterModel.messageTypes = types;
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
    var to = $(e.target).closest('.send-message').attr('data-send-to');
    var $modal = $('#send-message');
    var val = [];
    if (to) {
      var options = $modal.find('[name=phone]').data('options');
      var doc = _.find(options, function(option) {
        return option.doc.contact && option.doc.contact.phone === to;
      });
      if (doc) {
        val.push(doc);
      }
    }
    $modal.find('[name=phone]').select2('data', val);
    $modal.find('[name=message]').val('');
    $modal.modal('show');
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
      scope.filter(options);
    });
  };
  _applyFilter();

  db.changes({
    include_docs: true,
    filter: 'medic/data_records'
  }, function(err, data) {
    if (!err && data && data.results) {
      _applyFilter({ silent: true, changes: data });
    }
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

  function setupPhoneTypeahead(el) {

    el.parent().show();

    var format = function(row) {
      if (row.everyoneAt) {
        return 'Everyone at ' + row.doc.name;
      }
      var name = row.doc.name,
          contact = row.doc.contact,
          contactName = contact && contact.name,
          code = contact && contact.rc_code,
          phone = contact && contact.phone;
      return _.compact([name, contactName, code, phone]).join(', ');
    };

    el.select2({
      multiple: true,
      allowClear: true,
      formatResult: format,
      formatSelection: format,
      query: function(options) {
        var vals = options.element.data('options');
        var terms = options.term.toLowerCase().split(/w+/);
        var matches = _.filter(vals, function(val) {
          var contact = val.doc.contact;
          var name = contact && contact.name;
          var phone = contact && contact.phone;
          var tags = [ val.doc.name, name, phone ].join(' ').toLowerCase();
          return _.every(terms, function(term) {
            return tags.indexOf(term) > -1;
          });
        });
        matches.sort(function(a, b) {
          var aName = a.everyoneAt ? a.doc.name + 'z' : format(a);
          var bName = b.everyoneAt ? b.doc.name + 'z' : format(b);
          return aName.toLowerCase().localeCompare(bName.toLowerCase());
        });
        options.callback({ results: matches });
      }
    });

  }

  setupPhoneTypeahead($('#send-message [name=phone]'));

  $('#send-message [name=message]').on('keyup', function(e) {
    var target = $(e.target);
    var count = target.val().length;
    var msg = '';
    if (count > 50) {
        msg = count + '/160 characters';
    }
    target.closest('.modal-content').find('.modal-footer .note').text(msg);
  });


  var redirectToLogin = function() {
    window.location = '/dashboard/_design/dashboard/_rewrite/login' +
      '?redirect=' + window.location;
  };
  $('#logout').on('click', function(e) {
    e.preventDefault();
    session.logout(redirectToLogin);
  });
  session.on('change', function (userCtx) {
    if (!userCtx.name) {
      redirectToLogin();
    }
  });
  var user = $('html').data('user').name;
  if (user) {
    db.use('_users').getDoc('org.couchdb.user:' + user, function(err, user) {
      if (err) {
        return console.log('Error fetching user', err);
      }
      $('#edit-user-profile #fullname').val(user.fullname);
      $('#edit-user-profile #email').val(user.email);
      $('#edit-user-profile #phone').val(user.phone);
      $('#edit-user-profile #language').val(user.language);
    });
  } else {
    redirectToLogin();
  }

});